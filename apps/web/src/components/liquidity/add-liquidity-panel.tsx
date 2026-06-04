"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, maxUint256, parseEther, parseUnits, type Address } from "viem";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { tokenAbi } from "@/lib/abis/factory";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { dexRouterLiquidityAbi } from "@/lib/liquidity/dex-router-abi";
import {
  getLiquidityPair,
  LIQUIDITY_DEADLINE_SECONDS,
  LIQUIDITY_PAIR_OPTIONS,
  pairConflictsWithToken,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { erc20Abi } from "@/lib/swap/abis";
import { cn, shortenAddress } from "@/lib/utils";

type AddLiquidityPanelProps = {
  initialToken?: string;
  showManageLink?: boolean;
};

function formatBalance(amount: bigint, decimals: number, maxFrac = 4): string {
  const raw = formatUnits(amount, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

export function AddLiquidityPanel({ initialToken = "", showManageLink = true }: AddLiquidityPanelProps) {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { tokens: walletTokens, loading: walletLoading, refresh: refreshWalletTokens } =
    useWalletLiquidityTokens(address);

  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [pairId, setPairId] = useState<LiquidityPairId>("OPN");
  const [tokenAmount, setTokenAmount] = useState("");
  const [pairAmount, setPairAmount] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [status, setStatus] = useState<string | null>(null);

  const pair = getLiquidityPair(pairId);
  const validToken = isValidTokenAddress(tokenAddress);
  const pairConflict = validToken && pairConflictsWithToken(pair, tokenAddress);

  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: pairTokenBalance, refetch: refetchPairBalance } = useReadContract({
    address: !pair.isNative && pair.address && validToken ? pair.address : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
  });

  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, DEX_ROUTER_ADDRESS] : undefined,
  });

  const { data: pairAllowance, refetch: refetchPairAllowance } = useReadContract({
    address: !pair.isNative && pair.address && validToken ? pair.address : undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, DEX_ROUTER_ADDRESS] : undefined,
  });

  useEffect(() => {
    setTokenAddress(initialToken);
  }, [initialToken]);

  useEffect(() => {
    if (!validToken || !client) return;
    let cancelled = false;
    client
      .readContract({
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: "decimals",
      })
      .then((d) => {
        if (!cancelled) setTokenDecimals(Number(d));
      })
      .catch(() => {
        if (!cancelled) setTokenDecimals(18);
      });
    return () => {
      cancelled = true;
    };
  }, [validToken, tokenAddress, client]);

  const parsedTokenAmount = useMemo(() => {
    if (!tokenAmount || Number(tokenAmount) <= 0) return null;
    try {
      return parseUnits(tokenAmount, tokenDecimals);
    } catch {
      return null;
    }
  }, [tokenAmount, tokenDecimals]);

  const parsedPairAmount = useMemo(() => {
    if (!pairAmount || Number(pairAmount) <= 0) return null;
    try {
      return pair.isNative ? parseEther(pairAmount) : parseUnits(pairAmount, pair.decimals);
    } catch {
      return null;
    }
  }, [pairAmount, pair]);

  const needsTokenApproval =
    parsedTokenAmount !== null && (tokenAllowance ?? 0n) < parsedTokenAmount;
  const needsPairApproval =
    !pair.isNative && parsedPairAmount !== null && (pairAllowance ?? 0n) < parsedPairAmount;

  const pairBalanceDisplay = pair.isNative
    ? nativeBalance?.value
    : pairTokenBalance;
  const pairBalanceDecimals = pair.decimals;

  async function approveToken() {
    if (!validToken) return;
    setStatus(null);
    await writeContractAsync({
      address: tokenAddress as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [DEX_ROUTER_ADDRESS, maxUint256],
    });
    await refetchTokenAllowance();
    setStatus("Token approved.");
  }

  async function approvePairToken() {
    if (!pair.address) return;
    setStatus(null);
    await writeContractAsync({
      address: pair.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [DEX_ROUTER_ADDRESS, maxUint256],
    });
    await refetchPairAllowance();
    setStatus(`${pair.symbol} approved.`);
  }

  async function addLiquidity() {
    if (!address || !validToken || !parsedTokenAmount || !parsedPairAmount || pairConflict) return;

    setStatus(null);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + LIQUIDITY_DEADLINE_SECONDS);

    if (pair.isNative) {
      await writeContractAsync({
        address: DEX_ROUTER_ADDRESS,
        abi: dexRouterLiquidityAbi,
        functionName: "addLiquidityETH",
        args: [tokenAddress as Address, parsedTokenAmount, 0n, 0n, address, deadline],
        value: parsedPairAmount,
      });
    } else if (pair.address) {
      await writeContractAsync({
        address: DEX_ROUTER_ADDRESS,
        abi: dexRouterLiquidityAbi,
        functionName: "addLiquidity",
        args: [
          tokenAddress as Address,
          pair.address,
          parsedTokenAmount,
          parsedPairAmount,
          0n,
          0n,
          address,
          deadline,
        ],
      });
    }

    setStatus("Liquidity added successfully.");
    reset();
    await Promise.all([
      refetchTokenBalance(),
      refetchPairBalance(),
      refetchNativeBalance(),
      refetchTokenAllowance(),
      refetchPairAllowance(),
      refreshWalletTokens(),
    ]);
  }

  const busy = isPending || confirming;
  const canAddLiquidity =
    isConnected &&
    validToken &&
    !pairConflict &&
    parsedTokenAmount &&
    parsedPairAmount &&
    !needsTokenApproval &&
    !needsPairApproval &&
    !busy;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Select token</CardTitle>
          <CardDescription>
            Paste a contract address, search by name, or pick a token detected in your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwapTokenPicker value={tokenAddress} onChange={setTokenAddress} label="Project token" />

          {isConnected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-muted-foreground">Tokens in your wallet</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={walletLoading}
                  onClick={() => void refreshWalletTokens()}
                >
                  {walletLoading ? "Scanning…" : "Refresh"}
                </Button>
              </div>

              {walletLoading && walletTokens.length === 0 ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : walletTokens.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No indexed tokens found in your wallet yet. Paste any ERC-20 contract address above.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {walletTokens.map((t) => {
                    const active = tokenAddress.toLowerCase() === t.contractAddress.toLowerCase();
                    return (
                      <button
                        key={t.contractAddress}
                        type="button"
                        onClick={() => setTokenAddress(t.contractAddress)}
                        className={cn(
                          "flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
                          active && "border-primary bg-primary/5"
                        )}
                      >
                        <span className="font-semibold">
                          {t.symbol}
                          {t.isCreator && (
                            <span className="ml-2 text-xs font-normal text-primary">Created by you</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{t.name}</span>
                        <span className="mt-1 font-mono text-xs text-muted-foreground">
                          {shortenAddress(t.contractAddress, 6)}
                        </span>
                        <span className="mt-1 text-xs">
                          Balance: {formatBalance(t.balance, t.decimals)} {t.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {validToken && (
        <Card>
          <CardHeader>
            <CardTitle>2. Pair with</CardTitle>
            <CardDescription>Choose which asset to pair your token with on the DEX.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {LIQUIDITY_PAIR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPairId(option.id)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    pairId === option.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {pairConflict && (
              <p className="mt-3 text-sm text-red-600">
                This token is {pair.symbol}. Choose a different project token or pair asset.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {validToken && !pairConflict && (
        <Card>
          <CardHeader>
            <CardTitle>3. Add liquidity</CardTitle>
            <CardDescription>
              Approve spending, then add liquidity via the OPNChain DEX router.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <p className="text-sm text-muted-foreground">Connect your wallet to continue.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Token amount</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Balance:{" "}
                      {tokenBalance !== undefined
                        ? `${formatBalance(tokenBalance, tokenDecimals)} (wallet)`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label>{pair.symbol} amount</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={pairAmount}
                      onChange={(e) => setPairAmount(e.target.value)}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Balance:{" "}
                      {pairBalanceDisplay !== undefined
                        ? `${formatBalance(pairBalanceDisplay, pairBalanceDecimals)} ${pair.symbol}`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {needsTokenApproval && (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void approveToken()}>
                      Approve token
                    </Button>
                  )}
                  {needsPairApproval && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void approvePairToken()}
                    >
                      Approve {pair.symbol}
                    </Button>
                  )}
                  <Button type="button" disabled={!canAddLiquidity} onClick={() => void addLiquidity()}>
                    {busy ? "Confirm in wallet…" : `Add ${pair.symbol} liquidity`}
                  </Button>
                  {showManageLink && (
                    <Button asChild variant="ghost">
                      <Link href={`/liquidity/${tokenAddress}`}>Manage LP</Link>
                    </Button>
                  )}
                </div>

                {status && <p className="text-sm text-green-700">{status}</p>}
                {hash && (
                  <p className="font-mono text-xs text-muted-foreground">Tx: {shortenAddress(hash, 8)}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
