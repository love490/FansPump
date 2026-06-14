"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { RefreshCw } from "lucide-react";
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
  holdingUsd: number;
  unitPriceUsd: number;
};

type TokenView = "wallet" | "created";

function formatBalanceAmount(balance: bigint, decimals: number): string {
  const raw = formatUnits(balance, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function DashboardMyTokensTab() {
  const { address } = useAccount();
  const chainId = getActiveChainId();
  const [view, setView] = useState<TokenView>("wallet");
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

  const walletRows = useMemo(() => {
    const rows: TokenRow[] = [];

    for (const token of walletTokens) {
      if (token.balance <= 0n) continue;
      const key = token.contractAddress.toLowerCase();
      const holdingUsd = tokenUsdMap[key] ?? 0;
      const amount = Number(formatUnits(token.balance, token.decimals));
      const unitPriceUsd = amount > 0 && holdingUsd > 0 ? holdingUsd / amount : 0;

      rows.push({
        key,
        contractAddress: token.contractAddress,
        name: token.name,
        symbol: token.symbol,
        logoUrl: token.logoUrl,
        balance: token.balance,
        decimals: token.decimals,
        holdingUsd,
        unitPriceUsd,
      });
    }

    return rows.sort((a, b) => {
      if (a.holdingUsd !== b.holdingUsd) return b.holdingUsd - a.holdingUsd;
      return a.name.localeCompare(b.name);
    });
  }, [walletTokens, tokenUsdMap]);

  const createdRows = useMemo(() => {
    const walletByAddr = new Map(walletTokens.map((t) => [t.contractAddress.toLowerCase(), t]));

    return createdTokens
      .map((token) => {
        const key = token.contractAddress.toLowerCase();
        const wallet = walletByAddr.get(key);
        const balance = wallet?.balance ?? 0n;
        const decimals = wallet?.decimals ?? 18;
        const holdingUsd = tokenUsdMap[key] ?? 0;
        const amount = Number(formatUnits(balance, decimals));
        const unitPriceUsd = amount > 0 && holdingUsd > 0 ? holdingUsd / amount : 0;

        return {
          key,
          contractAddress: token.contractAddress,
          name: token.name,
          symbol: token.symbol,
          logoUrl: token.logoUrl,
          balance,
          decimals,
          holdingUsd,
          unitPriceUsd,
        } satisfies TokenRow;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [createdTokens, walletTokens, tokenUsdMap]);

  const rows = view === "wallet" ? walletRows : createdRows;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setView("wallet")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              view === "wallet"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Wallet
          </button>
          <button
            type="button"
            onClick={() => setView("created")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              view === "created"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Created
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={isFetching}
          onClick={() => void refetch()}
          aria-label="Refresh tokens"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {view === "wallet"
              ? "No tokens in your wallet yet — buy on Swap or create one."
              : "You have not created any tokens yet."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {view === "wallet" ? (
              <>
                <Button asChild size="sm">
                  <Link href="/swap">Swap</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/create">Create token</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/create">Create token</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rows.map((row) => (
            <Link
              key={row.key}
              href={`/token/${row.contractAddress}`}
              className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/30"
            >
              <TokenLogo src={row.logoUrl} symbol={row.symbol} name={row.name} layout="fixed" size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold uppercase tracking-wide">{row.symbol}</p>
                <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                  {row.balance > 0n
                    ? formatBalanceAmount(row.balance, row.decimals)
                    : "0"}
                </p>
                <p className="mt-1 font-semibold tabular-nums">
                  {row.holdingUsd > 0 ? formatMarketPrice(row.holdingUsd) : "—"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {row.unitPriceUsd > 0 ? formatMarketPrice(row.unitPriceUsd) : "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
