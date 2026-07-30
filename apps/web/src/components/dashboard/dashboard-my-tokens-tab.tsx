"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { Plus, RefreshCw, Search, Star, Wallet2 } from "lucide-react";
import { TokenLogo } from "@/components/tokens/token-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportTokenDialog } from "@/components/dashboard/import-token-dialog";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useDashboardPortfolio } from "@/components/dashboard/wallet-portfolio-provider";
import { useWatchlistAddresses } from "@/hooks/dashboard/useWatchlistAddresses";
import { erc20Abi } from "@/lib/swap/abis";
import { formatMarketPrice } from "@/lib/tokens/market-metrics";
import { liquidityUrl } from "@/lib/navigation/liquidity-routes";
import { bigintToFloat, type PortfolioAsset } from "@/lib/dashboard/wallet-balance";
import { readImportedTokens, type ImportedToken } from "@/lib/dashboard/imported-tokens";
import { categorizeAsset, ALLOCATION_LABELS, type AllocationCategory } from "@/lib/dashboard/allocation";
import { addTokenToWallet } from "@/lib/wallet/watch-asset";
import { walletTokenHref } from "@/lib/dashboard/wallet-token-route";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "created", label: "Created" },
  { id: "owned", label: "Owned" },
  { id: "favorites", label: "Favorites" },
  { id: "lp", label: "LP tokens" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function formatBalanceAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function tokenHref(row: PortfolioAsset): string | null {
  if (row.isLp) {
    if (row.projectTokenAddress?.startsWith("0x")) {
      return liquidityUrl({ tab: "remove", token: row.projectTokenAddress });
    }
    return liquidityUrl({ tab: "remove" });
  }
  if (row.isNative || row.symbol === "OPN") return walletTokenHref(null, "OPN");
  if (row.contractAddress?.startsWith("0x")) return walletTokenHref(row.contractAddress, row.symbol);
  return null;
}

function rowKey(row: PortfolioAsset): string {
  if (row.isLp) return `lp-${row.contractAddress ?? row.symbol}`;
  return `${row.symbol}-${row.contractAddress ?? "native"}`;
}

function displaySymbol(row: PortfolioAsset): string {
  if (row.isLp) return row.symbol.replace(/\s+LP$/i, "");
  return row.symbol;
}

type DashboardMyTokensTabProps = {
  /** Set by the allocation chart so clicking a slice narrows this list. */
  categoryFilter?: AllocationCategory | null;
  onClearCategoryFilter?: () => void;
};

export function DashboardMyTokensTab({
  categoryFilter = null,
  onClearCategoryFilter,
}: DashboardMyTokensTabProps = {}) {
  const { walletAddress, hasWallet } = useActiveWallet();
  const client = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { assets, loading, refresh } = useDashboardPortfolio();
  const { addressSet: favoriteAddresses } = useWatchlistAddresses(walletAddress);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [imported, setImported] = useState<ImportedToken[]>([]);
  const [importedBalances, setImportedBalances] = useState<Record<string, bigint>>({});
  const [watchNotice, setWatchNotice] = useState<string | null>(null);

  useEffect(() => {
    setImported(readImportedTokens(walletAddress));
  }, [walletAddress]);

  const loadImportedBalances = useCallback(async () => {
    if (!client || !walletAddress || imported.length === 0) {
      setImportedBalances({});
      return;
    }
    try {
      const results = await client.multicall({
        contracts: imported.map((token) => ({
          address: token.contractAddress as Address,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [walletAddress as Address] as const,
        })),
        allowFailure: true,
      });
      const next: Record<string, bigint> = {};
      imported.forEach((token, index) => {
        const result = results[index];
        next[token.contractAddress.toLowerCase()] =
          result?.status === "success" && typeof result.result === "bigint" ? result.result : 0n;
      });
      setImportedBalances(next);
    } catch {
      setImportedBalances({});
    }
  }, [client, walletAddress, imported]);

  useEffect(() => {
    void loadImportedBalances();
  }, [loadImportedBalances]);

  const allRows = useMemo(() => {
    const rows: PortfolioAsset[] = assets.filter((a) => a.amount > 0);
    const known = new Set(
      rows.map((r) => r.contractAddress?.toLowerCase()).filter((a): a is string => Boolean(a))
    );

    for (const token of imported) {
      const addr = token.contractAddress.toLowerCase();
      if (known.has(addr)) continue;
      const raw = importedBalances[addr] ?? 0n;
      rows.push({
        symbol: token.symbol,
        name: token.name,
        amount: bigintToFloat(raw, token.decimals),
        opnValue: 0,
        usdValue: 0,
        decimals: token.decimals,
        contractAddress: addr,
        logoUrl: token.logoUrl,
      });
      known.add(addr);
    }

    return rows
      .map((asset) => ({
        ...asset,
        unitPriceUsd: asset.amount > 0 && asset.usdValue > 0 ? asset.usdValue / asset.amount : 0,
      }))
      .sort((a, b) => {
        const builtin = (s: string) => ["OPN", "WOPN", "USDT", "USDC"].includes(s.toUpperCase());
        const aBuiltin = builtin(a.symbol);
        const bBuiltin = builtin(b.symbol);
        if (aBuiltin !== bBuiltin) return aBuiltin ? -1 : 1;
        if (a.isLp !== b.isLp) return a.isLp ? 1 : -1;
        if (a.isCreator !== b.isCreator) return a.isCreator ? -1 : 1;
        if (a.usdValue !== b.usdValue) return b.usdValue - a.usdValue;
        if (a.amount !== b.amount) return b.amount - a.amount;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [assets, imported, importedBalances]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allRows.filter((row) => {
      if (categoryFilter && categorizeAsset(row) !== categoryFilter) return false;
      if (filter === "created" && !row.isCreator) return false;
      if (filter === "lp" && !row.isLp) return false;
      if (filter === "owned" && (row.isCreator || row.isLp)) return false;
      if (filter === "favorites") {
        const addr = row.contractAddress?.toLowerCase();
        if (!addr || !favoriteAddresses.has(addr)) return false;
      }
      if (!needle) return true;
      return (
        row.symbol.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        (row.contractAddress?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [allRows, filter, query, favoriteAddresses, categoryFilter]);

  const counts = useMemo(
    () => ({
      all: allRows.length,
      created: allRows.filter((r) => r.isCreator).length,
      owned: allRows.filter((r) => !r.isCreator && !r.isLp).length,
      favorites: allRows.filter(
        (r) => r.contractAddress && favoriteAddresses.has(r.contractAddress.toLowerCase())
      ).length,
      lp: allRows.filter((r) => r.isLp).length,
    }),
    [allRows, favoriteAddresses]
  );

  async function handleAddToWallet(row: PortfolioAsset & { unitPriceUsd?: number }) {
    if (!row.contractAddress) return;
    setWatchNotice(null);
    const result = await addTokenToWallet(walletClient, {
      address: row.contractAddress,
      symbol: displaySymbol(row),
      decimals: row.decimals ?? 18,
      logoUrl: row.logoUrl,
    });
    setWatchNotice(
      result.ok ? `${displaySymbol(row)} added to your wallet.` : result.error ?? "Request failed."
    );
  }

  if (!hasWallet) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Connect or link a wallet to see your token holdings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          All tokens in your wallet on OPN Chain — including tokens not created on FansPump.
        </p>
        <div className="flex items-center gap-2">
          <ImportTokenDialog
            walletAddress={walletAddress}
            onImported={(tokens) => setImported(tokens)}
          />
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
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, symbol, or address"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === option.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              {option.label}
              <span className="ml-1 tabular-nums opacity-70">{counts[option.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {categoryFilter && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate">
            Showing <span className="font-medium">{ALLOCATION_LABELS[categoryFilter]}</span> only
          </span>
          {onClearCategoryFilter && (
            <button
              type="button"
              onClick={onClearCategoryFilter}
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {watchNotice && <p className="text-sm text-muted-foreground">{watchNotice}</p>}

      {loading && allRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading your tokens…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {allRows.length === 0
              ? "No tokens in your wallet yet — buy on Swap or create one."
              : "No assets match this search or filter."}
          </p>
          {allRows.length === 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/swap">Swap</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/create">Create token</Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rows.map((row) => {
            const href = tokenHref(row);
            const symbol = displaySymbol(row);
            const isFavorite = Boolean(
              row.contractAddress && favoriteAddresses.has(row.contractAddress.toLowerCase())
            );

            return (
              <div key={rowKey(row)} className="flex items-center gap-3 px-3 py-3">
                {href ? (
                  <Link
                    href={href}
                    className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
                  >
                    <TokenLogo
                      src={row.logoUrl}
                      symbol={row.isLp ? symbol.split("/")[0] ?? symbol : row.symbol}
                      name={row.name}
                      layout="fixed"
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-base font-bold uppercase tracking-wide">
                          {symbol}
                        </p>
                        {isFavorite && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                        {row.isCreator && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                            Created
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                        {formatBalanceAmount(row.amount)}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <TokenLogo
                      src={row.logoUrl}
                      symbol={row.symbol}
                      name={row.name}
                      layout="fixed"
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold uppercase tracking-wide">
                        {symbol}
                      </p>
                      <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                        {formatBalanceAmount(row.amount)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">
                    {row.usdValue > 0 ? formatMarketPrice(row.usdValue) : "—"}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {row.unitPriceUsd > 0 ? formatMarketPrice(row.unitPriceUsd) : "—"}
                  </p>
                </div>

                {row.contractAddress && !row.isNative && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="Add to wallet"
                    aria-label={`Add ${symbol} to your wallet`}
                    onClick={() => void handleAddToWallet(row)}
                  >
                    <Wallet2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Plus className="h-3 w-3" />
          Missing a token? Use Import token to add it by contract address.
        </p>
      )}
    </div>
  );
}
