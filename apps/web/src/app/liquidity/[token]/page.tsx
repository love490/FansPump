"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, usePublicClient, useSignMessage, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Address } from "viem";
import { formatUnits, isAddress, parseUnits } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortenAddress } from "@/lib/utils";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { DEAD_BURN_ADDRESS, LIQUIDITY_LOCKER_ADDRESS } from "@/lib/liquidity/constants";
import { erc20Abi } from "@/lib/swap/abis";
import { liquidityLockerAbi, uniswapV2FactoryAbi, uniswapV2PairAbi, uniswapV2RouterAbi } from "@/lib/liquidity/abis";

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
  const tokenAddress = (params.token as string) ?? "";
  const token = isAddress(tokenAddress) ? (tokenAddress as Address) : null;

  const client = usePublicClient();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  const [tokenMeta, setTokenMeta] = useState<TokenDetail | null>(null);
  const [summary, setSummary] = useState<LiquiditySummary | null>(null);

  const [pair, setPair] = useState<Address | null>(null);
  const [lpDecimals, setLpDecimals] = useState<number>(18);
  const [lpTotalSupply, setLpTotalSupply] = useState<bigint>(0n);
  const [lpBalance, setLpBalance] = useState<bigint>(0n);
  const [lpBurned, setLpBurned] = useState<bigint>(0n);
  const [lpLocked, setLpLocked] = useState<bigint>(0n);

  const [burnAmount, setBurnAmount] = useState("");
  const [lockAmount, setLockAmount] = useState("");
  const [preset, setPreset] = useState<string>("30");
  const [customUnlockAt, setCustomUnlockAt] = useState<string>("");

  const canLock = token && !isZeroAddress(LIQUIDITY_LOCKER_ADDRESS);
  const isCreator = !!address && !!tokenMeta && address.toLowerCase() === tokenMeta.creatorAddress.toLowerCase();

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
    if (!token || !client) return;
    if (isZeroAddress(DEX_ROUTER_ADDRESS)) return;

    let cancelled = false;
    (async () => {
      try {
        const [weth, factory] = await Promise.all([
          client.readContract({ address: DEX_ROUTER_ADDRESS as Address, abi: uniswapV2RouterAbi, functionName: "WETH" }),
          client.readContract({ address: DEX_ROUTER_ADDRESS as Address, abi: uniswapV2RouterAbi, functionName: "factory" }),
        ]);

        const p = await client.readContract({
          address: factory as Address,
          abi: uniswapV2FactoryAbi,
          functionName: "getPair",
          args: [token, weth as Address],
        });

        if (cancelled) return;
        if (!p || isZeroAddress(String(p))) {
          setPair(null);
          return;
        }

        const pairAddr = p as Address;
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

        if (cancelled) return;
        setLpDecimals(Number(decimals));
        setLpTotalSupply(total as bigint);
        setLpBalance(myBal as bigint);
        setLpBurned(burnedBal as bigint);
        setLpLocked(lockedBal as bigint);
      } catch {
        if (!cancelled) setPair(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, client, address, canLock]);

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
    const amt = burnAmount.trim();
    const parsed = parseUnits(amt || "0", lpDecimals);
    if (parsed <= 0n) return;

    const txHash = await writeContractAsync({
      address: pair,
      abi: uniswapV2PairAbi,
      functionName: "transfer",
      args: [DEAD_BURN_ADDRESS, parsed],
    });

    await recordBurn({ lpToken: pair, amount: parsed, txHash: String(txHash) });
  }

  async function lockLp() {
    if (!pair || !canLock || !isConnected || !address) return;
    if (!unlockAt) return;
    const amt = lockAmount.trim();
    const parsed = parseUnits(amt || "0", lpDecimals);
    if (parsed <= 0n) return;

    await writeContractAsync({
      address: pair,
      abi: erc20Abi,
      functionName: "approve",
      args: [LIQUIDITY_LOCKER_ADDRESS, parsed],
    });

    const txHash = await writeContractAsync({
      address: LIQUIDITY_LOCKER_ADDRESS,
      abi: liquidityLockerAbi,
      functionName: "lock",
      args: [pair, parsed, BigInt(Math.floor(unlockAt / 1000))],
    });

    await recordLock({ lpToken: pair, amount: parsed, unlockAtMs: unlockAt, txHash: String(txHash) });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold">Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          {tokenMeta ? `${tokenMeta.name} (${tokenMeta.symbol})` : "Token"} ·{" "}
          <span className="font-mono">{token ? shortenAddress(token, 6) : tokenAddress}</span>
        </p>
      </header>

      {!token || !client ? (
        <p className="text-muted-foreground">Invalid token address.</p>
      ) : isZeroAddress(DEX_ROUTER_ADDRESS) ? (
        <Card>
          <CardHeader>
            <CardTitle>Router not configured</CardTitle>
            <CardDescription>Set `NEXT_PUBLIC_DEX_ROUTER_ADDRESS` to show LP status and manage locks/burns.</CardDescription>
          </CardHeader>
        </Card>
      ) : !pair ? (
        <Card>
          <CardHeader>
            <CardTitle>No LP pair found</CardTitle>
            <CardDescription>Add liquidity first to create the token/OPN pair.</CardDescription>
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
              <CardTitle>LP token</CardTitle>
              <CardDescription className="font-mono">{pair}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your LP balance:{" "}
              <span className="font-mono text-foreground">{formatUnits(lpBalance, lpDecimals)}</span>
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

          {!isCreator ? (
            <Card>
              <CardHeader>
                <CardTitle>Creator actions</CardTitle>
                <CardDescription>Connect the creator wallet to lock or burn LP tokens.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Lock LP tokens</CardTitle>
                  <CardDescription>Lock LP tokens in a time-lock contract.</CardDescription>
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
                          <Input type="datetime-local" value={customUnlockAt} onChange={(e) => setCustomUnlockAt(e.target.value)} />
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label>LP amount</Label>
                        <Input value={lockAmount} onChange={(e) => setLockAmount(e.target.value)} placeholder="0.0" />
                      </div>
                      <Button onClick={lockLp} disabled={!isConnected || confirming || !lockAmount || !unlockAt}>
                        Lock liquidity
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Burn LP tokens</CardTitle>
                  <CardDescription>Transfer LP tokens permanently to the burn address.</CardDescription>
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
                  <Button variant="destructive" onClick={burnLp} disabled={!isConnected || confirming || !burnAmount}>
                    Burn LP
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

