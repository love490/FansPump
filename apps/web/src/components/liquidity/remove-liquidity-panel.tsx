"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import type { Address, Hash } from "viem";
import { formatUnits, isAddress, maxUint256, parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { dexRouterLiquidityAbi } from "@/lib/liquidity/dex-router-abi";
import { simulateRemoveLiquidity } from "@/lib/liquidity/remove-liquidity-tx";
import {
  getLiquidityPair,
  LIQUIDITY_DEADLINE_SECONDS,
  LIQUIDITY_PAIR_OPTIONS,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";
import { findPairAddress, quoteCandidatesForPairId } from "@/lib/liquidity/pair-resolve";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { uniswapV2PairAbi } from "@/lib/liquidity/abis";
import { erc20Abi } from "@/lib/swap/abis";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { formatLiquidityAmountFromWei } from "@/lib/liquidity/format-amount";
import { shortenAddress } from "@/lib/utils";
import Link from "next/link";
import { liquidityUrl } from "@/lib/navigation/liquidity-routes";

type RemoveLiquidityPanelProps = {
  tokenAddress: string;
  pairId: LiquidityPairId;
  onRemoved?: () => void;
};

function isZeroAddress(a: string) {
  return a.toLowerCase() === "0x0000000000000000000000000000000000000000";
}

export function RemoveLiquidityPanel({
  tokenAddress,
  pairId: initialPairId,
  onRemoved,
}: RemoveLiquidityPanelProps) {
  const token = isAddress(tokenAddress) ? (tokenAddress as Address) : null;
  const client = usePublicClient();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [pairId, setPairId] = useState<LiquidityPairId>(initialPairId);
  const pairMeta = getLiquidityPair(pairId);
  const [tokenSymbol, setTokenSymbol] = useState("Token");
  const [pair, setPair] = useState<Address | null>(null);
  const [lpDecimals, setLpDecimals] = useState(18);
  const [lpBalance, setLpBalance] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [removeAmount, setRemoveAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPairData = useCallback(async () => {
    if (!token || !client || isZeroAddress(DEX_ROUTER_ADDRESS)) {
      setPair(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const weth = await readRouterWeth(client, DEX_ROUTER_ADDRESS);
      const factory = await resolveDexFactory(client);
      const quotes = quoteCandidatesForPairId(
        pairId,
        weth,
        opnChainConfig.contracts.wopnExplicit,
        opnChainConfig.contracts.usdt,
        opnChainConfig.contracts.usdc
      );
      const pairAddr = await findPairAddress(client, factory, token, quotes);

      if (!pairAddr) {
        setPair(null);
        return;
      }

      setPair(pairAddr);
      const [decimals, myBal] = await Promise.all([
        client.readContract({ address: pairAddr, abi: uniswapV2PairAbi, functionName: "decimals" }),
        address
          ? client.readContract({
              address: pairAddr,
              abi: uniswapV2PairAbi,
              functionName: "balanceOf",
              args: [address],
            })
          : Promise.resolve(0n),
      ]);
      setLpDecimals(Number(decimals));
      setLpBalance(myBal as bigint);
    } catch {
      setPair(null);
    } finally {
      setLoading(false);
    }
  }, [token, client, address, pairId]);

  useEffect(() => {
    setPairId(initialPairId);
  }, [initialPairId]);

  useEffect(() => {
    if (!token) return;
    void client
      ?.readContract({ address: token, abi: erc20Abi, functionName: "symbol" })
      .then((s) => {
        if (typeof s === "string" && s) setTokenSymbol(s);
      })
      .catch(() => undefined);
  }, [token, client]);

  useEffect(() => {
    void loadPairData();
  }, [loadPairData]);

  async function waitForTx(hash: Hash) {
    if (!client) return;
    await client.waitForTransactionReceipt({ hash });
  }

  async function removeLiquidity() {
    if (!pair || !token || !client || !address || !isConnected) return;
    const parsed = parseUnits(removeAmount.trim() || "0", lpDecimals);
    if (parsed <= 0n || parsed > lpBalance) return;

    setBusy(true);
    setError(null);
    setStatus(null);
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
      setStatus(`Removed ${removeAmount} LP from ${tokenSymbol}/${pairMeta.symbol}.`);
      setRemoveAmount("");
      await loadPairData();
      onRemoved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove liquidity failed");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-muted-foreground">Invalid token address.</p>;
  }

  if (isZeroAddress(DEX_ROUTER_ADDRESS)) {
    return (
      <p className="text-sm text-muted-foreground">
        DEX router is not configured on this network.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">
            Remove {tokenSymbol} / {pairMeta.symbol}
          </p>
          <p className="text-sm text-muted-foreground">Withdraw your LP from this pool.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LIQUIDITY_PAIR_OPTIONS.map((opt) => (
            <Link
              key={opt.id}
              href={liquidityUrl({ token: tokenAddress, tab: "remove", pair: opt.id })}
              className={
                pairId === opt.id
                  ? "rounded-full border border-primary bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  : "rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              }
            >
              {opt.symbol}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      ) : !pair ? (
        <p className="text-sm text-muted-foreground">
          No {tokenSymbol}/{pairMeta.symbol} pool found.{" "}
          <Link href={liquidityUrl({ token: tokenAddress })} className="text-primary hover:underline">
            Add liquidity
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-0.5">
            <span className="truncate font-mono text-xs text-muted-foreground" title={pair}>
              {shortenAddress(pair, 6)}
            </span>
            <AddressCopyButton value={pair} className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            Balance:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatLiquidityAmountFromWei(lpBalance, lpDecimals)} LP
            </span>
          </p>
          {lpBalance > 0n ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-2">
                <Label>LP amount</Label>
                <Input
                  value={removeAmount}
                  onChange={(e) => setRemoveAmount(e.target.value)}
                  placeholder="0.0"
                  disabled={!isConnected || busy}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!isConnected || busy}
                onClick={() => setRemoveAmount(formatUnits(lpBalance, lpDecimals))}
              >
                MAX
              </Button>
              <Button
                type="button"
                disabled={!isConnected || busy || !removeAmount.trim()}
                onClick={() => void removeLiquidity()}
              >
                {busy ? "Removing…" : "Remove liquidity"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">You have no LP in this pool.</p>
          )}
        </>
      )}

      {!isConnected && (
        <p className="text-sm text-muted-foreground">Connect your wallet to remove liquidity.</p>
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
