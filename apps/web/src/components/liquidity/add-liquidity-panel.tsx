"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, maxUint256, parseEther, parseUnits, type Address, type Hash } from "viem";
import { SwapTokenPicker } from "@/components/swap/swap-token-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { tokenAbi } from "@/lib/abis/factory";
import { DEX_ROUTER_ADDRESS, opnChain } from "@/lib/wagmi";
import { dexRouterLiquidityAbi } from "@/lib/liquidity/dex-router-abi";
import { simulateAddLiquidity } from "@/lib/liquidity/add-liquidity-tx";
import {
  getLiquidityPair,
  LIQUIDITY_DEADLINE_SECONDS,
  LIQUIDITY_PAIR_OPTIONS,
  pairConflictsWithToken,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { erc20Abi } from "@/lib/swap/abis";
import { saveLiquidityPosition } from "@/lib/liquidity/my-liquidity-storage";
import { cn, shortenAddress } from "@/lib/utils";
import { opnChainConfig } from "@/lib/chain-config/opn";

type AddLiquidityPanelProps = {
  initialToken?: string;
  showManageLink?: boolean;
  onLiquidityAdded?: () => void;
};

type LiquidityAction = "idle" | "approve-token" | "approve-pair" | "add";

function formatBalance(amount: bigint, decimals: number, maxFrac = 4): string {
  const raw = formatUnits(amount, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

function parseError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "shortMessage" in e && typeof (e as { shortMessage: string }).shortMessage === "string") {
    return (e as { shortMessage: string }).shortMessage;
  }
  return "Transaction failed";
}

export function AddLiquidityPanel({
  initialToken = "",
  showManageLink = true,
  onLiquidityAdded,
}: AddLiquidityPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const { tokens: walletTokens, loading: walletLoading, refresh: refreshWalletTokens } =
    useWalletLiquidityTokens(address);

  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [pairId, setPairId] = useState<LiquidityPairId>("OPN");
  const [tokenAmount, setTokenAmount] = useState("");
  const [pairAmount, setPairAmount] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<LiquidityAction>("idle");
  const [processing, setProcessing] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<Hash | undefined>();

  const pair = getLiquidityPair(pairId);
  const validToken = isValidTokenAddress(tokenAddress);
  const pairConflict = validToken && pairConflictsWithToken(pair, tokenAddress);
  const wrongNetwork = isConnected && chainId !== opnChain.id;

  const { writeContractAsync } = useWriteContract();

  const { data: tokenSymbolRaw } = useReadContract({
    address: validToken ? (tokenAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "symbol",
  });

  const tokenSymbol =
    typeof tokenSymbolRaw === "string" && tokenSymbolRaw.length > 0 ? tokenSymbolRaw : "Token";

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

  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({ address });

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

  const pairBalanceDisplay = pair.isNative ? nativeBalance?.value : pairTokenBalance;
  const pairBalanceDecimals = pair.decimals;

  const busy = processing;

  const amountsValid = Boolean(parsedTokenAmount && parsedPairAmount && !pairConflict);

  const RECEIPT_TIMEOUT_MS = 120_000;

  async function waitForTx(hash: Hash) {
    if (!client) throw new Error("Network client unavailable");
    const receipt = await client.waitForTransactionReceipt({
      hash,
      timeout: RECEIPT_TIMEOUT_MS,
    });
    if (receipt.status !== "success") {
      throw new Error("Transaction reverted on-chain");
    }
    return receipt;
  }

  async function submitTx(
    request: {
      address: Address;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
      value?: bigint;
    },
    label: string
  ): Promise<Hash> {
    setStatus(`${label} — confirm in your wallet…`);
    setError(null);
    const hash = await writeContractAsync(
      request as Parameters<typeof writeContractAsync>[0]
    );
    setLastTxHash(hash);
    await waitForTx(hash);
    return hash;
  }

  async function readAllowance(token: Address, owner: Address): Promise<bigint> {
    if (!client) return 0n;
    return client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, DEX_ROUTER_ADDRESS],
    });
  }

  async function addLiquidity() {
    if (!address || !client || !validToken || !parsedTokenAmount || !parsedPairAmount || pairConflict) {
      return;
    }

    setProcessing(true);
    setAction("add");
    setError(null);

    try {
      const tokenAllowanceNow = await readAllowance(tokenAddress as Address, address);
      if (tokenAllowanceNow < parsedTokenAmount) {
        setAction("approve-token");
        await submitTx(
          {
            address: tokenAddress as Address,
            abi: erc20Abi,
            functionName: "approve",
            args: [DEX_ROUTER_ADDRESS, maxUint256],
          },
          `Step 1 — Approve ${tokenSymbol} in your wallet`
        );
        await refetchTokenAllowance();
      }

      if (!pair.isNative && pair.address) {
        const pairAllowanceNow = await readAllowance(pair.address, address);
        if (pairAllowanceNow < parsedPairAmount) {
          setAction("approve-pair");
          await submitTx(
            {
              address: pair.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [DEX_ROUTER_ADDRESS, maxUint256],
            },
            `Step 2 — Approve ${pair.symbol} in your wallet`
          );
          await refetchPairAllowance();
        }
      }

      setAction("add");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + LIQUIDITY_DEADLINE_SECONDS);

      const tokenAllowanceFinal = await readAllowance(tokenAddress as Address, address);
      if (tokenAllowanceFinal < parsedTokenAmount) {
        throw new Error(`${tokenSymbol} approval failed or was rejected.`);
      }

      if (!pair.isNative && pair.address) {
        const pairAllowanceFinal = await readAllowance(pair.address, address);
        if (pairAllowanceFinal < parsedPairAmount) {
          throw new Error(`${pair.symbol} approval failed or was rejected.`);
        }
      }

      const tx = await simulateAddLiquidity({
        client,
        router: DEX_ROUTER_ADDRESS,
        account: address,
        token: tokenAddress as Address,
        pair,
        amountToken: parsedTokenAmount,
        amountPair: parsedPairAmount,
        deadline,
      });

      let addHash: Hash;
      if (tx.value > 0n) {
        addHash = await submitTx(
          {
            address: DEX_ROUTER_ADDRESS,
            abi: dexRouterLiquidityAbi,
            functionName: tx.functionName,
            args: [...tx.args],
            value: tx.value,
          },
          `Final step — Add liquidity (${tokenSymbol}/${pair.symbol}) in your wallet`
        );
      } else {
        addHash = await submitTx(
          {
            address: DEX_ROUTER_ADDRESS,
            abi: dexRouterLiquidityAbi,
            functionName: tx.functionName,
            args: [...tx.args],
          },
          `Final step — Add liquidity (${tokenSymbol}/${pair.symbol}) in your wallet`
        );
      }

      console.log("[liquidity] Transaction confirmed, saving position...");
      saveLiquidityPosition({
        tokenAddress: tokenAddress.toLowerCase(),
        tokenSymbol,
        pairId,
        pairSymbol: pair.symbol,
        txHash: addHash,
        addedAt: new Date().toISOString(),
      });

      setStatus(`Liquidity added (${tokenSymbol}/${pair.symbol}).`);
      onLiquidityAdded?.();

      await Promise.all([
        refetchTokenBalance(),
        refetchPairBalance(),
        refetchNativeBalance(),
        refetchTokenAllowance(),
        refetchPairAllowance(),
        refreshWalletTokens(),
      ]);
    } catch (e) {
      console.error("[liquidity] Error:", e);
      setError(parseError(e));
      setStatus(null);
    } finally {
      setAction("idle");
      setProcessing(false);
    }
  }

  const pendingSteps =
    (needsTokenApproval ? 1 : 0) + (needsPairApproval ? 1 : 0) + 1;

  const addLiquidityLabel =
    action === "approve-token"
      ? `Approving ${tokenSymbol}… (${pendingSteps} wallet steps)`
      : action === "approve-pair"
        ? `Approving ${pair.symbol}… (${pendingSteps} wallet steps)`
        : action === "add"
          ? `Adding liquidity…`
          : pendingSteps > 1
            ? `Add liquidity (${pendingSteps} steps in wallet)`
            : `Add liquidity (${tokenSymbol}/${pair.symbol})`;

  const terminalSuccess =
    Boolean(status && !busy && status.toLowerCase().includes("liquidity added"));

  function dismissNotice() {
    setStatus(null);
    setError(null);
    setLastTxHash(undefined);
  }

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
              Click once — your wallet will walk you through each step (approve {tokenSymbol}
              {needsPairApproval ? `, approve ${pair.symbol}` : pair.isNative ? ", send OPN" : ""}, then add
              liquidity).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <p className="text-sm text-muted-foreground">Connect your wallet to continue.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{tokenSymbol} amount</Label>
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
                        ? `${formatBalance(tokenBalance, tokenDecimals)} ${tokenSymbol}`
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

                <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">One button — wallet will ask for:</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    {needsTokenApproval && (
                      <li>
                        <strong>Approve {tokenSymbol}</strong>
                      </li>
                    )}
                    {needsPairApproval && (
                      <li>
                        <strong>Approve {pair.symbol}</strong>
                      </li>
                    )}
                    {pair.isNative && !needsPairApproval && (
                      <li>
                        <strong>OPN</strong> included with add liquidity (no OPN approval)
                      </li>
                    )}
                    <li>
                      <strong>Add liquidity ({tokenSymbol}/{pair.symbol})</strong>
                    </li>
                  </ol>
                  {!needsTokenApproval && !needsPairApproval && (
                    <p className="mt-2 text-xs text-green-700">Approvals already set — one wallet confirm.</p>
                  )}
                </div>

                {wrongNetwork && (
                  <p className="text-sm text-amber-700">
                    Switch your wallet to {opnChain.name} (chain {opnChain.id}).
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={!amountsValid || busy || wrongNetwork}
                    onClick={() => void addLiquidity()}
                  >
                    {addLiquidityLabel}
                  </Button>
                  {showManageLink && (
                    <Button asChild variant="ghost">
                      <Link href={`/liquidity/${tokenAddress}`}>Manage LP</Link>
                    </Button>
                  )}
                </div>

                {status && busy && (
                  <p className="text-sm text-muted-foreground">{status}</p>
                )}

                {terminalSuccess && status && (
                  <DismissibleAlert variant="success" onDismiss={dismissNotice}>
                    {status}
                    {lastTxHash && (
                      <p className="mt-2 font-mono text-xs opacity-80">
                        Tx:{" "}
                        <a
                          href={`${opnChainConfig.explorerUrl.replace(/\/$/, "")}/tx/${lastTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {shortenAddress(lastTxHash, 10)}
                        </a>
                      </p>
                    )}
                  </DismissibleAlert>
                )}

                {error && !busy && (
                  <DismissibleAlert variant="error" onDismiss={dismissNotice}>
                    {error}
                  </DismissibleAlert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
