"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Flame, Sparkles } from "lucide-react";
import { TokenMarketTable } from "@/components/tokens/token-market-table";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import { ExplorePromoCards } from "@/components/explore/explore-promo-cards";
import { fetchDiscoverTokens, tokenQueryKeys } from "@/lib/tokens-api";
import { buildHomePreviewSections } from "@/lib/tokens/home-sections";
import { getActiveChainId } from "@/lib/chain-config/opn";

const PREVIEW_LIMIT = 24;
const MARKET_LIMIT = 50;

export function HomeTokenSections() {
  const chainId = getActiveChainId();

  const [marketQuery, trendingQuery, newQuery, allQuery] = useQueries({
    queries: [
      {
        queryKey: tokenQueryKeys.discover("top-token", chainId),
        queryFn: () => fetchDiscoverTokens("top-token", MARKET_LIMIT),
        staleTime: 15_000,
        retry: 2,
      },
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

  const marketRaw = marketQuery.data ?? [];
  const trendingRaw = trendingQuery.data ?? [];
  const newestRaw = newQuery.data ?? [];
  const allTokens = allQuery.data ?? [];

  const market = marketRaw.length > 0 ? marketRaw : allTokens.slice(0, MARKET_LIMIT);

  const { trending, newest } = useMemo(
    () =>
      buildHomePreviewSections({
        market,
        trending: trendingRaw,
        newest: newestRaw,
        previewLimit: PREVIEW_LIMIT,
      }),
    [market, trendingRaw, newestRaw]
  );

  const isLoading =
    marketQuery.isLoading || trendingQuery.isLoading || newQuery.isLoading || allQuery.isLoading;
  const isError =
    marketQuery.isError &&
    trendingQuery.isError &&
    newQuery.isError &&
    allQuery.isError &&
    market.length === 0 &&
    trending.length === 0 &&
    newest.length === 0;

  const previewEmpty = "No tokens yet — be the first to launch.";
  const loadError = "Could not load tokens. Check your connection and try again.";

  function retryAll() {
    void marketQuery.refetch();
    void trendingQuery.refetch();
    void newQuery.refetch();
    void allQuery.refetch();
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <TokenMarketTable
        tokens={market}
        title="Top Token"
        description="Highest-ranked tokens by trust and volume."
        isLoading={isLoading}
        includeBaseTokens
        emptyMessage={isError ? loadError : "No tokens to display yet."}
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
