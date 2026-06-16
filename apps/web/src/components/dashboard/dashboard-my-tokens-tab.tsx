"use client";

import Link from "next/link";
import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { TokenLogo } from "@/components/tokens/token-logo";
import { Button } from "@/components/ui/button";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { formatMarketPrice } from "@/lib/tokens/market-metrics";
import { cn } from "@/lib/utils";

function formatBalanceAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function tokenHref(symbol: string, contractAddress?: string | null, isNative?: boolean): string | null {
  if (isNative || symbol === "OPN") return "/swap";
  if (contractAddress?.startsWith("0x")) return `/token/${contractAddress}`;
  return null;
}

export function DashboardMyTokensTab() {
  const { assets, loading, refresh } = useWalletPortfolioBalance();

  const rows = useMemo(() => {
    return assets
      .filter((a) => a.amount > 0)
      .map((asset) => {
        const unitPriceUsd = asset.amount > 0 && asset.usdValue > 0 ? asset.usdValue / asset.amount : 0;
        return { ...asset, unitPriceUsd };
      })
      .sort((a, b) => {
        const builtin = (s: string) => ["OPN", "WOPN", "USDT"].includes(s.toUpperCase());
        const aBuiltin = builtin(a.symbol);
        const bBuiltin = builtin(b.symbol);
        if (aBuiltin !== bBuiltin) return aBuiltin ? -1 : 1;
        if (a.usdValue !== b.usdValue) return b.usdValue - a.usdValue;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [assets]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading your tokens…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={loading}
          onClick={() => void refresh()}
          aria-label="Refresh tokens"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No tokens in your wallet yet — buy on Swap or create one.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/swap">Swap</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/create">Create token</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rows.map((row) => {
            const href = tokenHref(row.symbol, row.contractAddress, row.isNative);
            const content = (
              <>
                <TokenLogo
                  src={row.logoUrl}
                  symbol={row.symbol}
                  name={row.name}
                  layout="fixed"
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold uppercase tracking-wide">{row.symbol}</p>
                  <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                    {formatBalanceAmount(row.amount)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">
                    {row.usdValue > 0 ? formatMarketPrice(row.usdValue) : "—"}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {row.unitPriceUsd > 0 ? formatMarketPrice(row.unitPriceUsd) : "—"}
                  </p>
                </div>
              </>
            );

            if (href) {
              return (
                <Link
                  key={`${row.symbol}-${row.contractAddress ?? "native"}`}
                  href={href}
                  className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={`${row.symbol}-${row.contractAddress ?? "native"}`}
                className="flex items-center gap-3 px-3 py-3"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
