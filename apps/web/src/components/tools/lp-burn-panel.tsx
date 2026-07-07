"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount, usePublicClient, useReadContract, useSignMessage, useWriteContract } from "wagmi";
import { parseUnits, type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import {
  useMyLiquidityPositions,
  type MyLiquidityPosition,
} from "@/hooks/liquidity/useMyLiquidityPositions";
import { DEAD_BURN_ADDRESS } from "@/lib/liquidity/constants";
import { getOrCreateBurnAddress } from "@/lib/liquidity/burn-address";
import { erc20Abi } from "@/lib/swap/abis";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";

const lpErc20Abi = [
  ...erc20Abi,
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
import { formatLiquidityAmountFromWei, formatTokenLpPositionLabel } from "@/lib/liquidity/format-amount";
import { liquidityUrl } from "@/lib/navigation/liquidity-routes";
import { apiUrl } from "@/lib/api";
import { cn, shortenAddress } from "@/lib/utils";
import { formatContractError } from "@/lib/contract-errors";

type BurnTarget = {
  tokenAddress: string;
  tokenSymbol: string;
  pairLabel: string;
  lpToken: string;
  lpBalance: bigint;
  lpDecimals: number;
};

function positionKey(p: MyLiquidityPosition) {
  return `${p.tokenAddress}:${p.pairId}:${p.lpToken}`;
}

export function LpBurnPanel() {
  const searchParams = useSearchParams();
  const preselectToken = searchParams.get("token")?.toLowerCase() ?? "";
  const preselectLp = searchParams.get("lp")?.toLowerCase() ?? "";

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
  const [manualLpToken, setManualLpToken] = useState("");

  const selectedPosition = useMemo(() => {
    if (!selectedKey) return null;
    return activePositions.find((p) => positionKey(p) === selectedKey) ?? null;
  }, [activePositions, selectedKey]);

  useEffect(() => {
    if (preselectLp && isValidTokenAddress(preselectLp)) {
      setManualLpToken(preselectLp);
      setSelectedKey(null);
      return;
    }
    if (activePositions.length === 0) return;

    if (preselectToken) {
      const match = activePositions.find(
        (p) => p.tokenAddress.toLowerCase() === preselectToken
      );
      if (match) {
        setSelectedKey(positionKey(match));
        setManualLpToken("");
        return;
      }
    }

    if (!selectedKey) {
      setSelectedKey(positionKey(activePositions[0]));
    }
  }, [activePositions, preselectLp, preselectToken, selectedKey]);

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

  const pastedLpTarget = useMemo((): BurnTarget | null => {
    if (!validManualLp || manualLpBalance === undefined || manualLpBalance === 0n) return null;
    return {
      tokenAddress: preselectToken,
      tokenSymbol: "LP",
      pairLabel: "Custom",
      lpToken: manualLpToken.toLowerCase(),
      lpBalance: manualLpBalance,
      lpDecimals: Number(manualLpDecimals ?? 18),
    };
  }, [validManualLp, manualLpBalance, manualLpDecimals, manualLpToken, preselectToken]);

  const target: BurnTarget | null = useMemo(() => {
    if (pastedLpTarget) return pastedLpTarget;
    if (!selectedPosition) return null;
    return {
      tokenAddress: selectedPosition.tokenAddress,
      tokenSymbol: selectedPosition.tokenSymbol,
      pairLabel: selectedPosition.pairLabel,
      lpToken: selectedPosition.lpToken,
      lpBalance: selectedPosition.lpBalance,
      lpDecimals: selectedPosition.lpDecimals,
    };
  }, [pastedLpTarget, selectedPosition]);

  const burnDestination = useMemo((): Address => {
    if (target?.tokenAddress && address) {
      return getOrCreateBurnAddress(target.tokenAddress, address);
    }
    return DEAD_BURN_ADDRESS;
  }, [target?.tokenAddress, address]);

  const [burnAmount, setBurnAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function waitForTx(hash: `0x${string}`) {
    if (!client) return;
    await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  }

  async function recordBurn(args: {
    token: string;
    lpToken: Address;
    amount: bigint;
    txHash?: string;
  }) {
    if (!args.token || !address) return;
    try {
      const prefix = process.env.NEXT_PUBLIC_LIQUIDITY_MESSAGE_PREFIX ?? "FansPump Liquidity Action";
      const message = `${prefix}\nAction: BURN\nToken: ${args.token}\nLP: ${args.lpToken}\nAmount: ${args.amount.toString()}\nBurnAddress: ${burnDestination}\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      await fetch(apiUrl("/api/liquidity/burn"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddress: args.token,
          lpToken: args.lpToken,
          creatorWallet: address,
          amount: args.amount.toString(),
          burnAddress: burnDestination,
          txHash: args.txHash,
          message,
          signature,
        }),
      });
    } catch {
      // TrustScan indexing is best-effort; on-chain burn succeeded.
    }
  }

  async function burnLp() {
    if (!target || !isConnected || !address) return;
    const parsed = parseUnits(burnAmount.trim() || "0", target.lpDecimals);
    if (parsed <= 0n) return;
    if (parsed > target.lpBalance) {
      setError("Amount exceeds your LP balance");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      setStatus("Confirm burn in your wallet…");
      const txHash = await writeContractAsync({
        address: target.lpToken as Address,
        abi: lpErc20Abi,
        functionName: "transfer",
        args: [burnDestination, parsed],
      });
      await waitForTx(txHash);

      if (target.tokenAddress) {
        await recordBurn({
          token: target.tokenAddress,
          lpToken: target.lpToken as Address,
          amount: parsed,
          txHash: String(txHash),
        });
      }

      setStatus(`Burned ${burnAmount} LP permanently.`);
      setBurnAmount("");
      void refresh();
    } catch (e) {
      setError(formatContractError(e instanceof Error ? e.message : "Burn failed"));
      setStatus(null);
    } finally {
      setBusy(false);
    }
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
            Connect your wallet to see LP positions you can burn.
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
            first, or paste an LP pair contract below.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {activePositions.map((p) => {
              const key = positionKey(p);
              const active = selectedKey === key && !pastedLpTarget;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedKey(key);
                    setManualLpToken("");
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

      <div className="space-y-2">
        <Label htmlFor="burn-lp-pair-address">Or paste LP pair contract</Label>
        <Input
          id="burn-lp-pair-address"
          value={manualLpToken}
          onChange={(e) => {
            setManualLpToken(e.target.value);
            setSelectedKey(null);
          }}
          placeholder="0x…"
          disabled={!isConnected}
        />
      </div>

      {target && isConnected && (
        <div className="space-y-4 rounded-xl border p-4">
          <div>
            <p className="text-sm font-semibold">Burn settings</p>
            <p className="text-xs text-muted-foreground">
              Sending LP to{" "}
              {target.tokenSymbol !== "LP"
                ? `${target.tokenSymbol} / ${target.pairLabel}`
                : `LP at ${shortenAddress(target.lpToken, 6)}`}
              {" · "}
              Balance:{" "}
              {formatLiquidityAmountFromWei(target.lpBalance, target.lpDecimals)}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Burn wallet: {shortenAddress(burnDestination, 8)}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="burn-lp-amount">LP amount to burn</Label>
            <Input
              id="burn-lp-amount"
              value={burnAmount}
              onChange={(e) => setBurnAmount(e.target.value)}
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
                  setBurnAmount(
                    formatLiquidityAmountFromWei(target.lpBalance, target.lpDecimals)
                  )
                }
              >
                Max
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={!burnAmount.trim() || busy}
            onClick={() => void burnLp()}
          >
            {busy ? "Burning…" : "Burn LP permanently"}
          </Button>
        </div>
      )}

      {!isConnected && (
        <p className="text-sm text-muted-foreground">Connect your wallet to burn LP.</p>
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
