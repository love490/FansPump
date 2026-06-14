"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { TokenLogo } from "@/components/tokens/token-logo";
import { Button } from "@/components/ui/button";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { fetchMyTokens } from "@/lib/token-register";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { tokenQueryKeys } from "@/lib/tokens-api";
import { formatMarketPrice } from "@/lib/tokens/market-metrics";
import { cn } from "@/lib/utils";

type TokenRow = {
  key: string;
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  balance: bigint;
  decimals: number;
  isCreated: boolean;
  isHeld: boolean;
  priceUsd: number;
};

export function DashboardMyTokensTab() {
  const { address } = useAccount();
  const chainId = getActiveChainId();
  const { tokens: walletTokens, loading: walletLoading } = useWalletLiquidityTokens(address);
  const { tokenUsdMap, loading: priceLoading } = useWalletPortfolioBalance();

  const {
    data: createdTokens = [],
    isLoading: createdLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: tokenQueryKeys.myTokens(address ?? "", chainId),
    queryFn: () => fetchMyTokens(address!),
    enabled: Boolean(address),
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const map = new Map<string, TokenRow>();

    for (const token of createdTokens) {
      const key = token.contractAddress.toLowerCase();
      map.set(key, {
        key,
        contractAddress: token.contractAddress,
        name: token.name,
        symbol: token.symbol,
        logoUrl: token.logoUrl,
        balance: 0n,
        decimals: 18,
        isCreated: true,
        isHeld: false,
        priceUsd: tokenUsdMap[key] ?? 0,
      });
    }

    for (const token of walletTokens) {
      if (token.balance <= 0n) continue;
      const key = token.contractAddress.toLowerCase();
      const existing = map.get(key);
      const totalUsd = tokenUsdMap[key] ?? existing?.priceUsd ?? 0;
      map.set(key, {
        key,
        contractAddress: token.contractAddress,
        name: token.name,
        symbol: token.symbol,
        logoUrl: token.logoUrl ?? existing?.logoUrl,
        balance: token.balance,
        decimals: token.decimals,
        isCreated: existing?.isCreated ?? token.isCreator,
        isHeld: true,
        priceUsd: totalUsd,
      });
    }

    return [...map.values()]
      .map((row) => {
        if (row.balance <= 0n || row.priceUsd <= 0) return row;
        const amount = Number(formatUnits(row.balance, row.decimals));
        if (amount <= 0) return row;
        return { ...row, priceUsd: row.priceUsd / amount };
      })
      .sort((a, b) => {
        if (a.isCreated !== b.isCreated) return a.isCreated ? -1 : 1;
        if (a.balance > 0n !== b.balance > 0n) return a.balance > 0n ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [createdTokens, walletTokens, tokenUsdMap]);

  const loading = createdLoading || walletLoading || priceLoading;

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading your tokens…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-400">
          {error instanceof Error ? error.message : "Failed to load tokens"}
        </p>
        <Button className="mt-4" type="button" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No tokens yet — create one or buy on Swap.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/create">Create token</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/swap">Swap</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Tokens you created and hold in your wallet.</p>
        <Button type="button" variant="ghost" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 text-left font-medium">Token</th>
              <th className="hidden px-3 py-2.5 text-left font-medium sm:table-cell">Type</th>
              <th className="px-3 py-2.5 text-right font-medium">Balance</th>
              <th className="px-3 py-2.5 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-3">
                  <Link
                    href={`/token/${row.contractAddress}`}
                    className="flex items-center gap-3 group"
                  >
                    <TokenLogo src={row.logoUrl} symbol={row.symbol} name={row.name} layout="fixed" size={32} />
                    <div className="min-w-0">
                      <p className="truncate font-medium group-hover:text-primary">{row.name}</p>
                      <p className="text-xs uppercase text-muted-foreground">{row.symbol}</p>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {row.isCreated && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Created
                      </span>
                    )}
                    {row.isHeld && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Held
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.balance > 0n
                    ? formatUnits(row.balance, row.decimals)
                    : row.isCreated
                      ? "—"
                      : "0"}
                </td>
                <td className={cn("px-3 py-3 text-right tabular-nums", row.priceUsd <= 0 && "text-muted-foreground")}>
                  {row.priceUsd > 0 ? formatMarketPrice(row.priceUsd) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
