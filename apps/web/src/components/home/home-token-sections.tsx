"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Sparkles } from "lucide-react";
import { TokenMarketTable } from "@/components/tokens/token-market-table";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import { ExplorePromoCards } from "@/components/explore/explore-promo-cards";
import type { TokenCardData } from "@/components/tokens/token-card";
import { fetchDiscoverTokens, tokenQueryKeys } from "@/lib/tokens-api";
import { buildHomePreviewSections } from "@/lib/tokens/home-sections";
import {
  DEFAULT_HOME_MARKET_TAB,
  getHomeMarketTab,
  HOME_MARKET_TABS,
  type HomeMarketTabId,
} from "@/lib/tokens/home-market-tabs";
import { getActiveChainId } from "@/lib/chain-config/opn";

const PREVIEW_LIMIT = 24;
const MARKET_LIMIT = 50;

async function fetchWatchlistTokens(wallet: string): Promise<TokenCardData[]> {
  const res = await fetch(`/api/watchlist?wallet=${wallet}`);
  if (!res.ok) throw new Error("Failed to load favorites");
  const data = (await res.json()) as { tokens?: TokenCardData[] };
  return data.tokens ?? [];
}

export function HomeTokenSections() {
  const chainId = getActiveChainId();
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<HomeMarketTabId>(DEFAULT_HOME_MARKET_TAB);

  const tabMeta = getHomeMarketTab(activeTab);
  const discoverTabs = HOME_MARKET_TABS.filter((t) => t.id !== "favorite");

  const sectionQueries = useQueries({
    queries: discoverTabs.map((tab) => ({
      queryKey: tokenQueryKeys.discover(tab.discoverSection, chainId),
      queryFn: () => fetchDiscoverTokens(tab.discoverSection, MARKET_LIMIT),
      staleTime: 15_000,
      retry: 2,
    })),
  });

  const [trendingQuery, newQuery, allQuery] = useQueries({
    queries: [
      {
        queryKey: tokenQueryKeys.discover("trending", chainId),
        queryFn: () => fetchDiscoverTokens("trending", PREVIEW_LIMIT),
        staleTime: 15_000,
        retry: 2,
      },
      {
        queryKey: tokenQueryKeys.discover("new", chainId),
        queryFn: () => fetchDiscoverTokens("new", PREVIEW_LIMIT),
        staleTime: 15_000,
        retry: 2,
      },
      {
        queryKey: tokenQueryKeys.discover("all", chainId),
        queryFn: () => fetchDiscoverTokens("all", 100),
        staleTime: 15_000,
        retry: 2,
      },
    ],
  });

  const favoritesQuery = useQuery({
    queryKey: ["watchlist", address?.toLowerCase() ?? "", chainId],
    queryFn: () => fetchWatchlistTokens(address!),
    enabled: Boolean(address),
    staleTime: 15_000,
  });

  const tokensByTab = useMemo(() => {
    const map = new Map<HomeMarketTabId, TokenCardData[]>();
    discoverTabs.forEach((tab, index) => {
      map.set(tab.id, sectionQueries[index]?.data ?? []);
    });
    map.set("favorite", favoritesQuery.data ?? []);

    const allTokens = allQuery.data ?? [];
    const topToken = map.get("top-token") ?? [];
    if (topToken.length === 0 && allTokens.length > 0) {
      map.set("top-token", allTokens.slice(0, MARKET_LIMIT));
    }

    return map;
  }, [discoverTabs, sectionQueries, favoritesQuery.data, allQuery.data]);
  const favoriteIds = useMemo(
    () => new Set((favoritesQuery.data ?? []).map((t) => t.id)),
    [favoritesQuery.data]
  );

  const activeTokens = tokensByTab.get(activeTab) ?? [];
  const marketForPreview = tokensByTab.get("top-token") ?? [];
  const trendingRaw = trendingQuery.data ?? [];
  const newestRaw = newQuery.data ?? [];

  const { trending, newest } = useMemo(
    () =>
      buildHomePreviewSections({
        market: marketForPreview,
        trending: trendingRaw,
        newest: newestRaw,
        previewLimit: PREVIEW_LIMIT,
      }),
    [marketForPreview, trendingRaw, newestRaw]
  );

  const sectionLoading =
    activeTab === "favorite"
      ? favoritesQuery.isLoading
      : sectionQueries[discoverTabs.findIndex((t) => t.id === activeTab)]?.isLoading ?? false;

  const isLoading =
    sectionLoading ||
    trendingQuery.isLoading ||
    newQuery.isLoading ||
    allQuery.isLoading;

  const isError =
    sectionQueries.every((q) => q.isError) &&
    trendingQuery.isError &&
    newQuery.isError &&
    allQuery.isError &&
    marketForPreview.length === 0 &&
    trending.length === 0 &&
    newest.length === 0;

  const previewEmpty = "No tokens yet — be the first to launch.";
  const loadError = "Could not load tokens. Check your connection and try again.";

  const emptyMessage = useMemo(() => {
    if (isError) return loadError;
    if (activeTab === "favorite") {
      if (!isConnected) return "Connect your wallet to see your favorite tokens.";
      return "No favorites yet — star a token in the table below.";
    }
    return "No tokens to display yet.";
  }, [isError, activeTab, isConnected]);

  const toggleFavorite = useCallback(
    async (tokenId: string) => {
      if (!address) return;
      const isFavorite = favoriteIds.has(tokenId);
      await fetch("/api/watchlist", {
        method: isFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, walletAddress: address }),
      });
      await queryClient.invalidateQueries({
        queryKey: ["watchlist", address.toLowerCase(), chainId],
      });
    },
    [address, chainId, favoriteIds, queryClient]
  );

  function retryAll() {
    void favoritesQuery.refetch();
    sectionQueries.forEach((q) => void q.refetch());
    void trendingQuery.refetch();
    void newQuery.refetch();
    void allQuery.refetch();
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <TokenMarketTable
        tokens={activeTokens}
        isLoading={sectionLoading}
        includeBaseTokens={tabMeta.includeBaseTokens}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
        emptyMessage={emptyMessage}
        tabs={HOME_MARKET_TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as HomeMarketTabId)}
      />

      <ExplorePromoCards />

      <TokenGridCarousel
        title="Trending"
        icon={<Flame className="h-6 w-6 text-orange-500" />}
        tokens={trending}
        isLoading={isLoading}
        viewAllHref="/discover?section=trending"
        variant="trending"
        fetchLimit={PREVIEW_LIMIT}
        emptyMessage={isError ? loadError : previewEmpty}
      />

      <TokenGridCarousel
        title="Newly Created"
        icon={<Sparkles className="h-6 w-6 text-emerald-500" />}
        tokens={newest}
        isLoading={isLoading}
        viewAllHref="/discover?section=new"
        variant="grid"
        fetchLimit={PREVIEW_LIMIT}
        emptyMessage={isError ? loadError : previewEmpty}
      />

      {isError && (
        <div className="text-center">
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={retryAll}
          >
            Retry loading tokens
          </button>
        </div>
      )}
    </div>
  );
}
