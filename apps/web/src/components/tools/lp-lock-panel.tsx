"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient, useReadContract, useSignMessage, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import { LiquidityPairPicker } from "@/components/liquidity/liquidity-pair-picker";
import {
  useMyLiquidityPositions,
  type MyLiquidityPosition,
} from "@/hooks/liquidity/useMyLiquidityPositions";
import { LIQUIDITY_LOCKER_ADDRESS } from "@/lib/liquidity/constants";
import { liquidityLockerAbi } from "@/lib/liquidity/abis";
import { erc20Abi } from "@/lib/swap/abis";
import { formatLiquidityAmountFromWei, formatTokenLpPositionLabel } from "@/lib/liquidity/format-amount";
import { liquidityUrl } from "@/lib/navigation/liquidity-routes";
import { apiUrl } from "@/lib/api";
import { cn, shortenAddress } from "@/lib/utils";
import { LIQUIDITY_PAIR_OPTIONS, type LiquidityPairId } from "@/lib/liquidity/pair-tokens";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { findPairAddress, quoteCandidatesForPairId } from "@/lib/liquidity/pair-resolve";
import { opnChainConfig } from "@/lib/chain-config/opn";

const LOCK_PRESETS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "365 days", days: 365 },
] as const;

type LockTarget = {
  tokenAddress: string;
  tokenSymbol: string;
  pairLabel: string;
  lpToken: string;
  lpBalance: bigint;
  lpDecimals: number;
};

function isLockerConfigured() {
  return (
    LIQUIDITY_LOCKER_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000"
  );
}

function positionKey(p: MyLiquidityPosition) {
  return `${p.tokenAddress}:${p.pairId}:${p.lpToken}`;
}

export function LpLockPanel() {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const { positions, loading, refresh } = useMyLiquidityPositions(address);

  const activePositions = useMemo(
    () => positions.filter((p) => !p.pending && p.lpBalance > 0n && p.lpToken),
    [positions]
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [manualPairId, setManualPairId] = useState<LiquidityPairId>("OPN");
  const [manualLpToken, setManualLpToken] = useState("");
  const [manualTarget, setManualTarget] = useState<LockTarget | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  const selectedPosition = useMemo(() => {
    if (!selectedKey) return null;
    return activePositions.find((p) => positionKey(p) === selectedKey) ?? null;
  }, [activePositions, selectedKey]);

  useEffect(() => {
    if (activePositions.length > 0 && !selectedKey) {
      setSelectedKey(positionKey(activePositions[0]));
    }
  }, [activePositions, selectedKey]);

  const validManualLp = isValidTokenAddress(manualLpToken);

  const { data: manualLpBalance } = useReadContract({
    address: validManualLp ? (manualLpToken as Address) : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: manualLpDecimals } = useReadContract({
    address: validManualLp ? (manualLpToken as Address) : undefined,
    abi: erc20Abi,
    functionName: "decimals",
  });

  useEffect(() => {
    if (!isConnected || !address || !client || !isValidTokenAddress(manualToken)) {
      setManualTarget(null);
      return;
    }

    let cancelled = false;
    setManualLoading(true);

    (async () => {
      try {
        const token = manualToken as Address;
        const [weth, factory] = await Promise.all([
          readRouterWeth(client, DEX_ROUTER_ADDRESS),
          resolveDexFactory(client),
        ]);
        const quotes = quoteCandidatesForPairId(
          manualPairId,
          weth,
          opnChainConfig.contracts.wopnExplicit,
          opnChainConfig.contracts.usdt,
          opnChainConfig.contracts.usdc
        );
        const pair = await findPairAddress(client, factory, token, quotes);
        if (!pair || cancelled) {
          if (!cancelled) setManualTarget(null);
          return;
        }

        const [balance, decimals, symbol] = await Promise.all([
          client.readContract({
            address: pair,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address as Address],
          }),
          client.readContract({
            address: pair,
            abi: erc20Abi,
            functionName: "decimals",
          }),
          client.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "symbol",
          }),
        ]);

        if (cancelled) return;
        const pairMeta = LIQUIDITY_PAIR_OPTIONS.find((p) => p.id === manualPairId);
        if (balance === 0n) {
          setManualTarget(null);
          return;
        }

        setManualTarget({
          tokenAddress: manualToken.toLowerCase(),
          tokenSymbol: typeof symbol === "string" ? symbol : "Token",
          pairLabel: pairMeta?.symbol ?? manualPairId,
          lpToken: pair.toLowerCase(),
          lpBalance: balance,
          lpDecimals: Number(decimals),
        });
        setSelectedKey(null);
      } catch {
        if (!cancelled) setManualTarget(null);
      } finally {
        if (!cancelled) setManualLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [manualToken, manualPairId, address, client, isConnected]);

  const pastedLpTarget = useMemo((): LockTarget | null => {
    if (!validManualLp || manualLpBalance === undefined || manualLpBalance === 0n) return null;
    return {
      tokenAddress: manualToken && isValidTokenAddress(manualToken) ? manualToken.toLowerCase() : "",
      tokenSymbol: "LP",
      pairLabel: "Custom",
      lpToken: manualLpToken.toLowerCase(),
      lpBalance: manualLpBalance,
      lpDecimals: Number(manualLpDecimals ?? 18),
    };
  }, [validManualLp, manualLpBalance, manualLpDecimals, manualLpToken, manualToken]);

  const target: LockTarget | null = useMemo(() => {
    if (pastedLpTarget) return pastedLpTarget;
    if (manualTarget) return manualTarget;
    if (!selectedPosition) return null;
    return {
      tokenAddress: selectedPosition.tokenAddress,
      tokenSymbol: selectedPosition.tokenSymbol,
      pairLabel: selectedPosition.pairLabel,
      lpToken: selectedPosition.lpToken,
      lpBalance: selectedPosition.lpBalance,
      lpDecimals: selectedPosition.lpDecimals,
    };
  }, [pastedLpTarget, manualTarget, selectedPosition]);

  const [lockAmount, setLockAmount] = useState("");
  const [preset, setPreset] = useState("30");
  const [customUnlockAt, setCustomUnlockAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLock = isLockerConfigured();

  const unlockAt = useMemo(() => {
    if (preset === "custom") return customUnlockAt ? new Date(customUnlockAt).getTime() : null;
    const days = Number(preset);
    if (!Number.isFinite(days) || days <= 0) return null;
    return Date.now() + days * 24 * 60 * 60 * 1000;
  }, [preset, customUnlockAt]);

  async function waitForTx(hash: `0x${string}`) {
    if (!client) return;
    await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  }

  async function recordLock(args: {
    token: string;
    lpToken: Address;
    amount: bigint;
    unlockAtMs: number;
    txHash?: string;
  }) {
    if (!args.token || !address) return;
    try {
      const prefix = process.env.NEXT_PUBLIC_LIQUIDITY_MESSAGE_PREFIX ?? "FansPump Liquidity Action";
      const message = `${prefix}\nAction: LOCK\nToken: ${args.token}\nLP: ${args.lpToken}\nAmount: ${args.amount.toString()}\nUnlockAt: ${new Date(
        args.unlockAtMs
      ).toISOString()}\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      await fetch(apiUrl("/api/liquidity/lock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddress: args.token,
          lpToken: args.lpToken,
          lockerAddress: LIQUIDITY_LOCKER_ADDRESS,
          creatorWallet: address,
          amount: args.amount.toString(),
          unlockAt: new Date(args.unlockAtMs).toISOString(),
          txHash: args.txHash,
          message,
          signature,
        }),
      });
    } catch {
      // TrustScan indexing is best-effort; on-chain lock succeeded.
    }
  }

  async function lockLp() {
    if (!target || !canLock || !isConnected || !address || !unlockAt) return;
    const parsed = parseUnits(lockAmount.trim() || "0", target.lpDecimals);
    if (parsed <= 0n) return;
    if (parsed > target.lpBalance) {
      setError("Amount exceeds your LP balance");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      setStatus("Approve locker in your wallet…");
      const approveHash = await writeContractAsync({
        address: target.lpToken as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [LIQUIDITY_LOCKER_ADDRESS, parsed],
      });
      await waitForTx(approveHash);

      setStatus("Confirm lock in your wallet…");
      const txHash = await writeContractAsync({
        address: LIQUIDITY_LOCKER_ADDRESS,
        abi: liquidityLockerAbi,
        functionName: "lock",
        args: [target.lpToken as Address, parsed, BigInt(Math.floor(unlockAt / 1000))],
      });
      await waitForTx(txHash);

      if (target.tokenAddress) {
        await recordLock({
          token: target.tokenAddress,
          lpToken: target.lpToken as Address,
          amount: parsed,
          unlockAtMs: unlockAt,
          txHash: String(txHash),
        });
      }

      setStatus(
        `Locked ${lockAmount} LP until ${new Date(unlockAt).toLocaleString()}.`
      );
      setLockAmount("");
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lock failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  if (!canLock) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        LP locking is not configured on this network yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>LP positions in your wallet</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? "Scanning…" : "Refresh"}
          </Button>
        </div>

        {!isConnected ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Connect your wallet to see LP positions you can lock.
          </p>
        ) : loading && activePositions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Scanning wallet for LP tokens…
          </p>
        ) : activePositions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No LP tokens found in your wallet.{" "}
            <Link href={liquidityUrl()} className="font-medium text-primary hover:underline">
              Add liquidity
            </Link>{" "}
            first, or pick a token and pair below.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {activePositions.map((p) => {
              const key = positionKey(p);
              const active = selectedKey === key && !pastedLpTarget && !manualTarget;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(key);
                    setManualLpToken("");
                    setManualTarget(null);
                  }}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
                    active && "border-primary bg-primary/5"
                  )}
                >
                  <span className="font-semibold">
                    {p.tokenSymbol} / {p.pairLabel}
                  </span>
                  <span className="mt-1 font-mono text-xs text-muted-foreground">
                    {shortenAddress(p.lpToken, 6)}
                  </span>
                  <span className="mt-1 text-xs">
                    Balance:{" "}
                    {formatTokenLpPositionLabel(
                      p.lpBalance,
                      p.lpDecimals,
                      p.tokenSymbol,
                      p.pairLabel
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div>
          <p className="text-sm font-semibold">Or choose token &amp; pair</p>
          <p className="text-xs text-muted-foreground">
            Pick a pool if your LP balance was not detected automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SwapTokenPicker
            value={manualToken}
            onChange={(v) => {
              setManualToken(v);
              setManualLpToken("");
            }}
            label="Token"
            searchPlaceholder="Paste token address or search"
          />
          <LiquidityPairPicker value={manualPairId} onChange={setManualPairId} />
        </div>
        {manualLoading && (
          <p className="text-xs text-muted-foreground">Looking up pool…</p>
        )}
        {manualTarget && !pastedLpTarget && (
          <p className="text-xs text-muted-foreground">
            Found {formatTokenLpPositionLabel(
              manualTarget.lpBalance,
              manualTarget.lpDecimals,
              manualTarget.tokenSymbol,
              manualTarget.pairLabel
            )}{" "}
            at {shortenAddress(manualTarget.lpToken, 6)}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="lp-pair-address">Or paste LP pair contract</Label>
          <Input
            id="lp-pair-address"
            value={manualLpToken}
            onChange={(e) => setManualLpToken(e.target.value)}
            placeholder="0x…"
            disabled={!isConnected}
          />
        </div>
      </div>

      {target && isConnected && (
        <div className="space-y-4 rounded-xl border p-4">
          <div>
            <p className="text-sm font-semibold">Lock settings</p>
            <p className="text-xs text-muted-foreground">
              Locking{" "}
              {target.tokenSymbol !== "LP"
                ? `${target.tokenSymbol} / ${target.pairLabel}`
                : `LP at ${shortenAddress(target.lpToken, 6)}`}
              {" · "}
              Balance:{" "}
              {formatLiquidityAmountFromWei(target.lpBalance, target.lpDecimals)}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lock-duration">Unlock after</Label>
            <select
              id="lock-duration"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={busy}
            >
              {LOCK_PRESETS.map((p) => (
                <option key={p.days} value={String(p.days)}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom unlock date</option>
            </select>
          </div>

          {preset === "custom" && (
            <div className="grid gap-2">
              <Label htmlFor="lock-unlock-at">Unlock date</Label>
              <Input
                id="lock-unlock-at"
                type="datetime-local"
                value={customUnlockAt}
                onChange={(e) => setCustomUnlockAt(e.target.value)}
                disabled={busy}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="lock-amount">LP amount to lock</Label>
            <Input
              id="lock-amount"
              value={lockAmount}
              onChange={(e) => setLockAmount(e.target.value)}
              placeholder="0.0"
              disabled={busy}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  setLockAmount(
                    formatLiquidityAmountFromWei(target.lpBalance, target.lpDecimals)
                  )
                }
              >
                Max
              </Button>
            </div>
          </div>

          {unlockAt && (
            <p className="text-xs text-muted-foreground">
              Unlocks: {new Date(unlockAt).toLocaleString()}
            </p>
          )}

          <Button
            type="button"
            disabled={!lockAmount.trim() || !unlockAt || busy}
            onClick={() => void lockLp()}
          >
            {busy ? "Locking…" : "Lock liquidity"}
          </Button>
        </div>
      )}

      {!isConnected && (
        <p className="text-sm text-muted-foreground">Connect your wallet to lock LP.</p>
      )}

      {status && (
        <DismissibleAlert variant="success" onDismiss={() => setStatus(null)}>
          {status}
        </DismissibleAlert>
      )}
      {error && (
        <DismissibleAlert variant="error" onDismiss={() => setError(null)}>
          {error}
        </DismissibleAlert>
      )}
    </div>
  );
}
