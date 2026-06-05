"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAccount, usePublicClient, useSignMessage, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { formatUnits, isAddress, maxUint256, parseUnits } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortenAddress, cn } from "@/lib/utils";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { DEAD_BURN_ADDRESS, LIQUIDITY_LOCKER_ADDRESS } from "@/lib/liquidity/constants";
import { erc20Abi } from "@/lib/swap/abis";
import { dexRouterLiquidityAbi } from "@/lib/liquidity/dex-router-abi";
import { simulateRemoveLiquidity } from "@/lib/liquidity/remove-liquidity-tx";
import {
  getLiquidityPair,
  LIQUIDITY_DEADLINE_SECONDS,
  LIQUIDITY_PAIR_OPTIONS,
  parseLiquidityPairId,
  quoteAddressForPairId,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import {
  liquidityLockerAbi,
  uniswapV2FactoryAbi,
  uniswapV2PairAbi,
  uniswapV2RouterAbi,
} from "@/lib/liquidity/abis";
import { opnChainConfig } from "@/lib/chain-config/opn";

type LiquiditySummary = {
  totals: { lockedAmount: string; burnedAmount: string; latestUnlockAt: string | null };
};

type TokenDetail = {
  id: string;
  name: string;
  symbol: string;
  creatorAddress: string;
};

const LOCK_PRESETS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "365 days", days: 365 },
] as const;

function isZeroAddress(a: string) {
  return a.toLowerCase() === "0x0000000000000000000000000000000000000000";
}

export default function LiquidityModulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tokenAddress = (params.token as string) ?? "";
  const token = isAddress(tokenAddress) ? (tokenAddress as Address) : null;
  const pairId = parseLiquidityPairId(searchParams.get("pair"));
  const pairMeta = getLiquidityPair(pairId);

  const client = usePublicClient();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const [tokenMeta, setTokenMeta] = useState<TokenDetail | null>(null);
  const [summary, setSummary] = useState<LiquiditySummary | null>(null);
  const [pair, setPair] = useState<Address | null>(null);
  const [lpDecimals, setLpDecimals] = useState<number>(18);
  const [lpTotalSupply, setLpTotalSupply] = useState<bigint>(0n);
  const [lpBalance, setLpBalance] = useState<bigint>(0n);
  const [lpBurned, setLpBurned] = useState<bigint>(0n);
  const [lpLocked, setLpLocked] = useState<bigint>(0n);
  const [loadingPair, setLoadingPair] = useState(true);

  const [burnAmount, setBurnAmount] = useState("");
  const [lockAmount, setLockAmount] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");
  const [preset, setPreset] = useState<string>("30");
  const [customUnlockAt, setCustomUnlockAt] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLock = token && !isZeroAddress(LIQUIDITY_LOCKER_ADDRESS);
  const isCreator =
    !!address && !!tokenMeta && address.toLowerCase() === tokenMeta.creatorAddress.toLowerCase();

  const loadPairData = useCallback(async () => {
    if (!token || !client || isZeroAddress(DEX_ROUTER_ADDRESS)) {
      setPair(null);
      setLoadingPair(false);
      return;
    }

    setLoadingPair(true);
    try {
      const weth = await readRouterWeth(client, DEX_ROUTER_ADDRESS);
      // Quote token sometimes differs between routers (WOPN vs WETH). To avoid a blank page,
      // try multiple candidates for the selected pairId.
      const wopnExplicit = opnChainConfig.contracts.wopnExplicit;
      const usdt = opnChainConfig.contracts.usdt;

      const quoteCandidatesSet = new Set<string>();
      const addCandidate = (a: string | null | undefined) => {
        if (!a) return;
        const s = a.toLowerCase();
        if (s && s !== "0x0000000000000000000000000000000000000000") quoteCandidatesSet.add(s);
      };

      if (pairId === "USDT") {
        addCandidate(usdt);
      } else if (pairId === "WOPN") {
        addCandidate(wopnExplicit);
        addCandidate(weth);
      } else {
        // OPN-native pair: try router wrapped token + explicit WOPN
        addCandidate(weth);
        addCandidate(wopnExplicit);
      }

      const quoteCandidates = [...quoteCandidatesSet].map((s) => s as Address);

      const factory = await client.readContract({
        address: DEX_ROUTER_ADDRESS,
        abi: uniswapV2RouterAbi,
        functionName: "factory",
      });

      let pairAddr: Address | null = null;
      for (const quote of quoteCandidates) {
        // UniswapV2 pair order-insensitive for getPair: (token0, token1) returned either way.
        // We just need any quote that matches the LP minted by add-liquidity.
        const p = await client.readContract({
          address: factory as Address,
          abi: uniswapV2FactoryAbi,
          functionName: "getPair",
          args: [token, quote],
        });
        if (p && !isZeroAddress(String(p))) {
          pairAddr = p as Address;
          break;
        }
      }

      if (!pairAddr) {
        setPair(null);
        return;
      }

      setPair(pairAddr);

      const [decimals, total, myBal, burnedBal, lockedBal] = await Promise.all([
        client.readContract({ address: pairAddr, abi: uniswapV2PairAbi, functionName: "decimals" }),
        client.readContract({ address: pairAddr, abi: uniswapV2PairAbi, functionName: "totalSupply" }),
        address
          ? client.readContract({ address: pairAddr, abi: uniswapV2PairAbi, functionName: "balanceOf", args: [address] })
          : Promise.resolve(0n),
        client.readContract({
          address: pairAddr,
          abi: uniswapV2PairAbi,
          functionName: "balanceOf",
          args: [DEAD_BURN_ADDRESS],
        }),
        canLock
          ? client.readContract({
              address: pairAddr,
              abi: uniswapV2PairAbi,
              functionName: "balanceOf",
              args: [LIQUIDITY_LOCKER_ADDRESS],
            })
          : Promise.resolve(0n),
      ]);

      setLpDecimals(Number(decimals));
      setLpTotalSupply(total as bigint);
      setLpBalance(myBal as bigint);
      setLpBurned(burnedBal as bigint);
      setLpLocked(lockedBal as bigint);
    } catch {
      setPair(null);
    } finally {
      setLoadingPair(false);
    }
  }, [token, client, address, canLock, pairId]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/tokens/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTokenMeta(d?.token ?? null))
      .catch(() => setTokenMeta(null));
    fetch(`/api/liquidity/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSummary(d ?? null))
      .catch(() => setSummary(null));
  }, [token]);

  useEffect(() => {
    void loadPairData();
  }, [loadPairData]);

  const lockedPct = useMemo(() => {
    if (lpTotalSupply === 0n) return 0;
    return Number((lpLocked * 10_000n) / lpTotalSupply) / 100;
  }, [lpLocked, lpTotalSupply]);

  const burnedPct = useMemo(() => {
    if (lpTotalSupply === 0n) return 0;
    return Number((lpBurned * 10_000n) / lpTotalSupply) / 100;
  }, [lpBurned, lpTotalSupply]);

  const unlockAt = useMemo(() => {
    if (preset === "custom") return customUnlockAt ? new Date(customUnlockAt).getTime() : null;
    const days = Number(preset);
    return Date.now() + days * 24 * 60 * 60 * 1000;
  }, [preset, customUnlockAt]);

  async function waitForTx(hash: `0x${string}`) {
    if (!client) return;
    await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  }

  async function recordLock(args: { lpToken: Address; amount: bigint; unlockAtMs: number; txHash?: string }) {
    if (!token || !tokenMeta || !address) return;
    const prefix = process.env.NEXT_PUBLIC_LIQUIDITY_MESSAGE_PREFIX ?? "FansPump Liquidity Action";
    const message = `${prefix}\nAction: LOCK\nToken: ${token}\nLP: ${args.lpToken}\nAmount: ${args.amount.toString()}\nUnlockAt: ${new Date(
      args.unlockAtMs
    ).toISOString()}\nWallet: ${address}\nTimestamp: ${Date.now()}`;
    const signature = await signMessageAsync({ message });
    await fetch("/api/liquidity/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenAddress: token,
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
  }

  async function recordBurn(args: { lpToken: Address; amount: bigint; txHash?: string }) {
    if (!token || !tokenMeta || !address) return;
    const prefix = process.env.NEXT_PUBLIC_LIQUIDITY_MESSAGE_PREFIX ?? "FansPump Liquidity Action";
    const message = `${prefix}\nAction: BURN\nToken: ${token}\nLP: ${args.lpToken}\nAmount: ${args.amount.toString()}\nBurnTo: ${DEAD_BURN_ADDRESS}\nWallet: ${address}\nTimestamp: ${Date.now()}`;
    const signature = await signMessageAsync({ message });
    await fetch("/api/liquidity/burn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenAddress: token,
        lpToken: args.lpToken,
        creatorWallet: address,
        amount: args.amount.toString(),
        burnAddress: DEAD_BURN_ADDRESS,
        txHash: args.txHash,
        burnedAt: new Date().toISOString(),
        message,
        signature,
      }),
    });
  }

  async function burnLp() {
    if (!pair || !isConnected || !address) return;
    const parsed = parseUnits(burnAmount.trim() || "0", lpDecimals);
    if (parsed <= 0n) return;

    setBusy(true);
    setError(null);
    try {
      const txHash = await writeContractAsync({
        address: pair,
        abi: uniswapV2PairAbi,
        functionName: "transfer",
        args: [DEAD_BURN_ADDRESS, parsed],
      });
      await waitForTx(txHash);
      await recordBurn({ lpToken: pair, amount: parsed, txHash: String(txHash) });
      setStatus("LP tokens burned.");
      setBurnAmount("");
      await loadPairData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Burn failed");
    } finally {
      setBusy(false);
    }
  }

  async function lockLp() {
    if (!pair || !canLock || !isConnected || !address || !unlockAt) return;
    const parsed = parseUnits(lockAmount.trim() || "0", lpDecimals);
    if (parsed <= 0n) return;

    setBusy(true);
    setError(null);
    try {
      const approveHash = await writeContractAsync({
        address: pair,
        abi: erc20Abi,
        functionName: "approve",
        args: [LIQUIDITY_LOCKER_ADDRESS, parsed],
      });
      await waitForTx(approveHash);

      const txHash = await writeContractAsync({
        address: LIQUIDITY_LOCKER_ADDRESS,
        abi: liquidityLockerAbi,
        functionName: "lock",
        args: [pair, parsed, BigInt(Math.floor(unlockAt / 1000))],
      });
      await waitForTx(txHash);
      await recordLock({ lpToken: pair, amount: parsed, unlockAtMs: unlockAt, txHash: String(txHash) });
      setStatus("LP tokens locked.");
      setLockAmount("");
      await loadPairData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lock failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeLiquidity() {
    if (!pair || !token || !client || !address || !isConnected) return;
    const parsed = parseUnits(removeAmount.trim() || "0", lpDecimals);
    if (parsed <= 0n || parsed > lpBalance) return;

    setBusy(true);
    setError(null);
    try {
      const allowance = await client.readContract({
        address: pair,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, DEX_ROUTER_ADDRESS],
      });

      if (allowance < parsed) {
        const approveHash = await writeContractAsync({
          address: pair,
          abi: erc20Abi,
          functionName: "approve",
          args: [DEX_ROUTER_ADDRESS, maxUint256],
        });
        await waitForTx(approveHash);
      }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + LIQUIDITY_DEADLINE_SECONDS);
      const tx = await simulateRemoveLiquidity({
        client,
        router: DEX_ROUTER_ADDRESS,
        account: address,
        token,
        pair: pairMeta,
        liquidity: parsed,
        deadline,
      });

      const removeHash = await writeContractAsync({
        address: DEX_ROUTER_ADDRESS,
        abi: dexRouterLiquidityAbi,
        functionName: tx.functionName,
        args: [...tx.args],
      });
      await waitForTx(removeHash);
      setStatus(`Removed ${removeAmount} LP from ${tokenMeta?.symbol ?? "token"}/${pairMeta.symbol} pool.`);
      setRemoveAmount("");
      await loadPairData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove liquidity failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Manage liquidity</h1>
          <p className="mt-1 text-muted-foreground">
            {tokenMeta ? `${tokenMeta.name} (${tokenMeta.symbol})` : "Token"} ·{" "}
            <span className="font-mono">{token ? shortenAddress(token, 6) : tokenAddress}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LIQUIDITY_PAIR_OPTIONS.map((opt) => (
            <Link
              key={opt.id}
              href={`/liquidity/${tokenAddress}?pair=${opt.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                pairId === opt.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {tokenMeta?.symbol ?? "Token"} / {opt.symbol}
            </Link>
          ))}
        </div>
      </header>

      {status && <p className="text-sm text-green-600 dark:text-green-400">{status}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!token || !client ? (
        <p className="text-muted-foreground">Invalid token address.</p>
      ) : isZeroAddress(DEX_ROUTER_ADDRESS) ? (
        <Card>
          <CardHeader>
            <CardTitle>Router not configured</CardTitle>
            <CardDescription>Set `NEXT_PUBLIC_DEX_ROUTER_ADDRESS` to manage liquidity.</CardDescription>
          </CardHeader>
        </Card>
      ) : loadingPair ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : !pair ? (
        <Card>
          <CardHeader>
            <CardTitle>No LP pair found</CardTitle>
            <CardDescription>
              No {tokenMeta?.symbol ?? "token"}/{pairMeta.symbol} pool yet. Add liquidity on{" "}
              <Link href="/my-liquidity" className="text-primary hover:underline">
                My Liquidity
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total LP supply</CardDescription>
                <CardTitle className="text-lg font-mono">{formatUnits(lpTotalSupply, lpDecimals)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Locked liquidity</CardDescription>
                <CardTitle className="text-lg font-mono">
                  {formatUnits(lpLocked, lpDecimals)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">({lockedPct.toFixed(2)}%)</span>
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>LP burned</CardDescription>
                <CardTitle className="text-lg font-mono">
                  {formatUnits(lpBurned, lpDecimals)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">({burnedPct.toFixed(2)}%)</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Your LP — {tokenMeta?.symbol ?? "Token"} / {pairMeta.symbol}
              </CardTitle>
              <CardDescription className="font-mono">{pair}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Balance:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {formatUnits(lpBalance, lpDecimals)} LP
                </span>
              </p>

              {lpBalance > 0n && (
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div>
                    <p className="font-medium">Remove liquidity</p>
                    <p className="text-xs text-muted-foreground">
                      Withdraw your share of {tokenMeta?.symbol ?? "token"} and {pairMeta.symbol} from the pool.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="grid flex-1 gap-2">
                      <Label>LP amount</Label>
                      <Input
                        value={removeAmount}
                        onChange={(e) => setRemoveAmount(e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRemoveAmount(formatUnits(lpBalance, lpDecimals))}
                    >
                      MAX
                    </Button>
                    <Button
                      onClick={removeLiquidity}
                      disabled={!isConnected || busy || !removeAmount}
                    >
                      Remove liquidity
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lock expiry</CardTitle>
              <CardDescription>Latest unlock recorded for this token</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {summary?.totals?.latestUnlockAt ? (
                <span className="font-mono">{new Date(summary.totals.latestUnlockAt).toLocaleString()}</span>
              ) : (
                <span className="text-muted-foreground">No lock recorded yet.</span>
              )}
            </CardContent>
          </Card>

          {isCreator ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Lock LP tokens</CardTitle>
                  <CardDescription>Creator only — lock LP in a time-lock contract.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!canLock ? (
                    <p className="text-sm text-muted-foreground">
                      Liquidity locker not configured. Set `NEXT_PUBLIC_LIQUIDITY_LOCKER_ADDRESS`.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        <Label>Lock duration</Label>
                        <select
                          className="flex h-10 w-full rounded-md border px-3 text-sm"
                          value={preset}
                          onChange={(e) => setPreset(e.target.value)}
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
                          <Label>Unlock date</Label>
                          <Input
                            type="datetime-local"
                            value={customUnlockAt}
                            onChange={(e) => setCustomUnlockAt(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label>LP amount</Label>
                        <Input value={lockAmount} onChange={(e) => setLockAmount(e.target.value)} placeholder="0.0" />
                      </div>
                      <Button onClick={lockLp} disabled={!isConnected || busy || !lockAmount || !unlockAt}>
                        Lock liquidity
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Burn LP tokens</CardTitle>
                  <CardDescription>Creator only — permanently send LP to the burn address.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <Label>Burn address</Label>
                    <Input value={DEAD_BURN_ADDRESS} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>LP amount</Label>
                    <Input value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} placeholder="0.0" />
                  </div>
                  <Button variant="destructive" onClick={burnLp} disabled={!isConnected || busy || !burnAmount}>
                    Burn LP
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Creator actions</CardTitle>
                <CardDescription>
                  Lock and burn LP are only available to the token creator wallet. You can still remove your
                  liquidity above.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
