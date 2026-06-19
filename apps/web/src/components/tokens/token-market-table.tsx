"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Star } from "lucide-react";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { TokenLogo } from "@/components/tokens/token-logo";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import { getPageSlice } from "@/lib/pagination";
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
import type { HomeMarketTabId } from "@/lib/tokens/home-market-tabs";

export type MarketTableTab = {
  id: string;
  label: string;
};

type TokenMarketTableProps = {
  tokens: TokenCardData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  includeBaseTokens?: boolean;
  favoriteIds?: Set<string>;
  canToggleFavorite?: boolean;
  onToggleFavorite?: (tokenId: string) => void;
  emptyMessage?: string;
  pageSize?: number;
  tabs?: MarketTableTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
};

const DEFAULT_PAGE_SIZE = 10;

const MOBILE_FILTERS: { id: HomeMarketTabId; label: string }[] = [
  { id: "views", label: "Most Viewed" },
  { id: "hot", label: "Hot" },
  { id: "gainer", label: "Gainer" },
  { id: "loser", label: "Loser" },
  { id: "new", label: "New" },
];

const MOBILE_SORT_OPTIONS: { key: MarketSortKey; label: string }[] = [
  { key: "change24h", label: "24H" },
  { key: "change1h", label: "1H" },
  { key: "marketCap", label: "Market Cap" },
  { key: "change7d", label: "7D" },
  { key: "volume24h", label: "Volume" },
];

const MOBILE_FILTER_IDS = new Set(MOBILE_FILTERS.map((f) => f.id));

const desktopColumns: { key: MarketSortKey | "name"; label: string; align?: "right" }[] = [
  { key: "rank", label: "#" },
  { key: "name", label: "Market" },
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

function mobileSortLabel(key: MarketSortKey): string {
  return MOBILE_SORT_OPTIONS.find((o) => o.key === key)?.label ?? "24H";
}

function MobileSortCell({ row, sortKey }: { row: MarketTableRow; sortKey: MarketSortKey }) {
  switch (sortKey) {
    case "change1h":
      return <ChangeCell value={row.change1h} />;
    case "change7d":
      return <ChangeCell value={row.change7d} />;
    case "marketCap":
      return (
        <span className="tabular-nums text-foreground">{formatMarketCompact(row.marketCap)}</span>
      );
    case "volume24h":
      return (
        <span className="tabular-nums text-foreground">{formatMarketCompact(row.volume24h)}</span>
      );
    case "change24h":
    default:
      return <ChangeCell value={row.change24h} />;
  }
}

function CompactSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TokenMarketTable({
  tokens,
  title,
  description,
  isLoading,
  includeBaseTokens = true,
  favoriteIds,
  canToggleFavorite,
  onToggleFavorite,
  emptyMessage = "No tokens to display yet.",
  pageSize = DEFAULT_PAGE_SIZE,
  tabs,
  activeTab,
  onTabChange,
}: TokenMarketTableProps) {
  const { hasWallet } = useActiveWallet();
  const [signInOpen, setSignInOpen] = useState(false);
  const allowFavorites = canToggleFavorite ?? hasWallet;
  const [sortKey, setSortKey] = useState<MarketSortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [mobileSortKey, setMobileSortKey] = useState<MarketSortKey>("change24h");
  const [page, setPage] = useState(1);

  const mobileFilterValue =
    activeTab && MOBILE_FILTER_IDS.has(activeTab as HomeMarketTabId)
      ? activeTab
      : MOBILE_FILTERS[0].id;

  const rows = useMemo(() => {
    const built = buildMarketTableRows(tokens, { includeBaseTokens });
    if (sortKey === "rank") return built;
    return sortMarketRows(built, sortKey, sortDir);
  }, [tokens, includeBaseTokens, sortKey, sortDir]);

  const mobileRows = useMemo(() => {
    const built = buildMarketTableRows(tokens, { includeBaseTokens });
    return sortMarketRows(built, mobileSortKey, "desc");
  }, [tokens, includeBaseTokens, mobileSortKey]);

  const pagination = useMemo(() => getPageSlice(rows, page, pageSize), [rows, page, pageSize]);
  const mobilePagination = useMemo(
    () => getPageSlice(mobileRows, page, pageSize),
    [mobileRows, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [tokens, sortKey, sortDir, mobileSortKey, pageSize, activeTab]);

  useEffect(() => {
    if (!onTabChange) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;
    if (!activeTab || !MOBILE_FILTER_IDS.has(activeTab as HomeMarketTabId)) {
      onTabChange(MOBILE_FILTERS[0].id);
    }
  }, [activeTab, onTabChange]);

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  function toggleSort(key: MarketSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "rank" ? "asc" : "desc");
  }

  const rowProps = {
    favoriteIds,
    allowFavorites,
    canToggleFavorite: Boolean(onToggleFavorite),
    onToggleFavorite,
    onNeedSignIn: () => setSignInOpen(true),
  };

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        {(title || description) && (
          <div>
            {title && <h2 className="text-lg font-bold sm:text-xl">{title}</h2>}
            {description && (
              <p className={cn("text-sm text-muted-foreground", title && "mt-1")}>{description}</p>
            )}
          </div>
        )}

        {tabs && tabs.length > 0 && onTabChange && (
          <div className="hidden gap-2 overflow-x-auto pb-1 md:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  activeTab === tab.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {onTabChange && (
          <div className="flex gap-2 md:hidden">
            <CompactSelect
              label="Filter"
              value={mobileFilterValue}
              onChange={(id) => onTabChange(id)}
              options={MOBILE_FILTERS.map((f) => ({ value: f.id, label: f.label }))}
            />
            <CompactSelect
              label="Sort"
              value={mobileSortKey}
              onChange={(key) => setMobileSortKey(key as MarketSortKey)}
              options={MOBILE_SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
            />
          </div>
        )}
      </div>

      {/* Mobile compact table */}
      <div
        key={`mobile-${mobileFilterValue}-${mobileSortKey}`}
        className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm md:hidden"
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <th className="w-9 px-2 py-2.5" aria-label="Favorite" />
              <th className="px-2 py-2.5 text-left">Market</th>
              <th className="px-2 py-2.5 text-right">Price</th>
              <th className="px-2 py-2.5 text-right">{mobileSortLabel(mobileSortKey)}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={4} className="px-2 py-3">
                    <div className="h-7 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : mobileRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              mobilePagination.items.map((row) => (
                <MarketRowMobile key={row.id} row={row} sortKey={mobileSortKey} {...rowProps} />
              ))
            )}
          </tbody>
        </table>
        {!isLoading && mobileRows.length > 0 && (
          <TablePagination
            page={mobilePagination.page}
            totalPages={mobilePagination.totalPages}
            startIndex={mobilePagination.startIndex}
            endIndex={mobilePagination.endIndex}
            totalCount={mobilePagination.total}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Desktop full table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-3 py-3" aria-label="Favorite" />
                {desktopColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-3",
                      col.align === "right" ? "text-right" : "text-left",
                      col.key !== "name" && "cursor-pointer select-none hover:text-foreground"
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
                  <tr key={i} className="border-b border-border">
                    <td colSpan={9} className="px-3 py-4">
                      <div className="h-8 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pagination.items.map((row) => (
                  <MarketRowDesktop key={row.id} row={row} {...rowProps} />
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && rows.length > 0 && (
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            totalCount={pagination.total}
            onPageChange={setPage}
          />
        )}
      </div>

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
    </section>
  );
}

function FavoriteButton({
  row,
  isFavorite,
  canToggleFavorite,
  allowFavorites,
  onNeedSignIn,
  onToggleFavorite,
}: {
  row: MarketTableRow;
  isFavorite: boolean;
  canToggleFavorite: boolean;
  allowFavorites: boolean;
  onNeedSignIn?: () => void;
  onToggleFavorite?: (tokenId: string) => void;
}) {
  const favoriteEnabled = canToggleFavorite && row.canFavorite;

  return (
    <button
      type="button"
      disabled={!favoriteEnabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!allowFavorites) {
          onNeedSignIn?.();
          return;
        }
        onToggleFavorite?.(row.id);
      }}
      className={cn(
        "pointer-events-auto relative z-20 rounded p-1 transition-colors",
        favoriteEnabled ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-40"
      )}
      aria-label={
        !allowFavorites
          ? "Sign in to add favorites"
          : isFavorite
            ? "Remove from favorites"
            : "Add to favorites"
      }
    >
      <Star
        className={cn("h-4 w-4", isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
      />
    </button>
  );
}

function MarketRowMobile({
  row,
  sortKey,
  favoriteIds,
  canToggleFavorite,
  allowFavorites,
  onNeedSignIn,
  onToggleFavorite,
}: {
  row: MarketTableRow;
  sortKey: MarketSortKey;
  favoriteIds?: Set<string>;
  canToggleFavorite: boolean;
  allowFavorites: boolean;
  onNeedSignIn?: () => void;
  onToggleFavorite?: (tokenId: string) => void;
}) {
  const isFavorite = favoriteIds?.has(row.id) ?? false;

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/50">
      <td className="px-2 py-2.5">
        <FavoriteButton
          row={row}
          isFavorite={isFavorite}
          canToggleFavorite={canToggleFavorite}
          allowFavorites={allowFavorites}
          onNeedSignIn={onNeedSignIn}
          onToggleFavorite={onToggleFavorite}
        />
      </td>
      <td className="px-2 py-2.5">
        <Link href={tokenHref(row)} className="flex min-w-0 items-center gap-2">
          <TokenLogo src={row.logoUrl} symbol={row.symbol} name={row.name} layout="fixed" size={24} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.symbol}</p>
            <p className="truncate text-[10px] text-muted-foreground">{row.name}</p>
          </div>
        </Link>
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums text-foreground">
        {formatMarketPrice(row.price)}
      </td>
      <td className="px-2 py-2.5 text-right">
        <MobileSortCell row={row} sortKey={sortKey} />
      </td>
    </tr>
  );
}

function MarketRowDesktop({
  row,
  favoriteIds,
  canToggleFavorite,
  allowFavorites,
  onNeedSignIn,
  onToggleFavorite,
}: {
  row: MarketTableRow;
  favoriteIds?: Set<string>;
  canToggleFavorite: boolean;
  allowFavorites: boolean;
  onNeedSignIn?: () => void;
  onToggleFavorite?: (tokenId: string) => void;
}) {
  const isFavorite = favoriteIds?.has(row.id) ?? false;

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/50">
      <td className="px-3 py-3">
        <FavoriteButton
          row={row}
          isFavorite={isFavorite}
          canToggleFavorite={canToggleFavorite}
          allowFavorites={allowFavorites}
          onNeedSignIn={onNeedSignIn}
          onToggleFavorite={onToggleFavorite}
        />
      </td>
      <td className="px-3 py-3 tabular-nums text-muted-foreground">{row.rank}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <TokenLogo src={row.logoUrl} symbol={row.symbol} name={row.name} layout="fixed" size={32} />
          <div className="min-w-0">
            <Link href={tokenHref(row)} className="group inline-flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground group-hover:text-primary">{row.name}</span>
              <span className="text-xs uppercase text-muted-foreground">{row.symbol}</span>
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
      <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatMarketPrice(row.price)}</td>
      <td className="px-3 py-3 text-right">
        <ChangeCell value={row.change1h} />
      </td>
      <td className="px-3 py-3 text-right">
        <ChangeCell value={row.change24h} />
      </td>
      <td className="px-3 py-3 text-right">
        <ChangeCell value={row.change7d} />
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-foreground">
        {formatMarketCompact(row.marketCap)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-foreground">
        {formatMarketCompact(row.volume24h)}
      </td>
    </tr>
  );
}
