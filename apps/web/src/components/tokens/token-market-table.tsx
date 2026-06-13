"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Star } from "lucide-react";
import { TokenLogo } from "@/components/tokens/token-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildMarketTableRows,
  formatMarketCompact,
  formatMarketPrice,
  formatPercentChange,
  sortMarketRows,
  type MarketSortKey,
  type MarketTableRow,
} from "@/lib/tokens/market-metrics";
import type { TokenCardData } from "@/components/tokens/token-card";

type TokenMarketTableProps = {
  tokens: TokenCardData[];
  title: string;
  description?: string;
  isLoading?: boolean;
  includeBaseTokens?: boolean;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (tokenId: string) => void;
  emptyMessage?: string;
};

const columns: { key: MarketSortKey | "name"; label: string; align?: "right" }[] = [
  { key: "rank", label: "#" },
  { key: "name", label: "Name" },
  { key: "price", label: "Price", align: "right" },
  { key: "change1h", label: "1h %", align: "right" },
  { key: "change24h", label: "24h %", align: "right" },
  { key: "change7d", label: "7d %", align: "right" },
  { key: "marketCap", label: "Market Cap", align: "right" },
  { key: "volume24h", label: "Volume (24h)", align: "right" },
];

function ChangeCell({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 tabular-nums",
        positive ? "text-emerald-500" : "text-rose-500"
      )}
    >
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatPercentChange(value)}
    </span>
  );
}

function swapHref(row: MarketTableRow) {
  if (!row.contractAddress || row.contractAddress === "native-opn" || row.symbol === "OPN") {
    return "/swap";
  }
  return `/swap/${row.contractAddress}`;
}

function tokenHref(row: MarketTableRow) {
  if (!row.contractAddress || row.isBaseToken) return swapHref(row);
  return `/token/${row.contractAddress}`;
}

export function TokenMarketTable({
  tokens,
  title,
  description,
  isLoading,
  includeBaseTokens = true,
  favoriteIds,
  onToggleFavorite,
  emptyMessage = "No tokens to display yet.",
}: TokenMarketTableProps) {
  const { isConnected } = useAccount();
  const [sortKey, setSortKey] = useState<MarketSortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const built = buildMarketTableRows(tokens, { includeBaseTokens });
    if (sortKey === "rank") return built;
    return sortMarketRows(built, sortKey, sortDir);
  }, [tokens, includeBaseTokens, sortKey, sortDir]);

  function toggleSort(key: MarketSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "rank" ? "asc" : "desc");
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-[#0b1220] text-slate-100 shadow-xl dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="w-10 px-3 py-3" aria-label="Favorite" />
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-3",
                      col.align === "right" ? "text-right" : "text-left",
                      col.key !== "name" && "cursor-pointer select-none hover:text-slate-200"
                    )}
                    onClick={() => col.key !== "name" && toggleSort(col.key as MarketSortKey)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key &&
                        (sortDir === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/80">
                    <td colSpan={9} className="px-3 py-4">
                      <div className="h-8 animate-pulse rounded bg-slate-800/80" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <MarketRow
                    key={row.id}
                    row={row}
                    isFavorite={favoriteIds?.has(row.id) ?? false}
                    canToggleFavorite={Boolean(isConnected && row.canFavorite && onToggleFavorite)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MarketRow({
  row,
  isFavorite,
  canToggleFavorite,
  onToggleFavorite,
}: {
  row: MarketTableRow;
  isFavorite: boolean;
  canToggleFavorite: boolean;
  onToggleFavorite?: (tokenId: string) => void;
}) {
  return (
    <tr className="border-b border-slate-800/80 transition-colors hover:bg-slate-900/70">
      <td className="px-3 py-3">
        <button
          type="button"
          disabled={!canToggleFavorite}
          onClick={() => onToggleFavorite?.(row.id)}
          className={cn(
            "rounded p-1 transition-colors",
            canToggleFavorite ? "hover:bg-slate-800" : "cursor-default opacity-40"
          )}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className={cn("h-4 w-4", isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-500")}
          />
        </button>
      </td>
      <td className="px-3 py-3 tabular-nums text-slate-400">{row.rank}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <TokenLogo src={row.logoUrl} symbol={row.symbol} name={row.name} layout="fixed" size={32} />
          <div className="min-w-0">
            <Link href={tokenHref(row)} className="group inline-flex flex-wrap items-center gap-2">
              <span className="font-semibold text-white group-hover:text-primary">{row.name}</span>
              <span className="text-xs uppercase text-slate-400">{row.symbol}</span>
            </Link>
            <div className="mt-1">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-6 border-primary/40 bg-transparent px-2 text-[11px] text-primary hover:bg-primary/10"
              >
                <Link href={swapHref(row)}>Buy</Link>
              </Button>
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-white">{formatMarketPrice(row.price)}</td>
      <td className="px-3 py-3 text-right">
        <ChangeCell value={row.change1h} />
      </td>
      <td className="px-3 py-3 text-right">
        <ChangeCell value={row.change24h} />
      </td>
      <td className="px-3 py-3 text-right">
        <ChangeCell value={row.change7d} />
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-white">{formatMarketCompact(row.marketCap)}</td>
      <td className="px-3 py-3 text-right tabular-nums text-white">{formatMarketCompact(row.volume24h)}</td>
    </tr>
  );
}
