"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Flame } from "lucide-react";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import { TokenMarketTable } from "@/components/tokens/token-market-table";
import { ExplorePromoCards } from "@/components/explore/explore-promo-cards";
import { cn } from "@/lib/utils";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import type { TokenCardData } from "@/components/tokens/token-card";

const CATEGORIES = [
  { id: "top-token", label: "Top Token", emoji: "🏆", description: "Highest-ranked tokens by trust and volume." },
  { id: "views", label: "Most Viewed Token", emoji: "👀", description: "Tokens with the most profile views." },
  { id: "favorite", label: "Favorite", emoji: "⭐", description: "Tokens you saved to your watchlist." },
  { id: "gainer", label: "Gainer", emoji: "📈", description: "Tokens with the strongest 24h volume momentum." },
  { id: "loser", label: "Loser", emoji: "📉", description: "Tokens with the weakest recent volume activity." },
  { id: "hot", label: "Hot", emoji: "🔥", description: "Fast-moving tokens gaining holders and attention." },
  { id: "new", label: "New", emoji: "✨", description: "Newly launched tokens on FansPump." },
  { id: "trending", label: "Trending", emoji: "📊", description: "Tokens with the highest trending score." },
] as const;

type ExploreCategoryId = (typeof CATEGORIES)[number]["id"];

async function fetchFavoriteTokens(wallet: string): Promise<TokenCardData[]> {
  const res = await fetch(`/api/watchlist?wallet=${wallet.toLowerCase()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { tokens?: TokenCardData[] };
  return (data.tokens ?? []).map((t) => ({
    ...t,
    id: t.id ?? t.contractAddress,
    viewCount: t.viewCount ?? 0,
    holderCount: t.holderCount ?? 0,
  }));
}

async function fetchWatchlistIds(wallet: string): Promise<Set<string>> {
  const tokens = await fetchFavoriteTokens(wallet);
  return new Set(tokens.map((t) => t.id));
}

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const chainId = getActiveChainId();
  const [category, setCategory] = useState<ExploreCategoryId>("top-token");

  const meta = CATEGORIES.find((c) => c.id === category)!;
  const filters: DiscoverFilters = {};

  const { data: trendingTokens = [], isLoading: loadingTrending } = useQuery({
    queryKey: tokenQueryKeys.discover("trending", chainId, filters),
    queryFn: () => fetchDiscoverTokens("trending", 12, filters),
    staleTime: 15_000,
  });

  const { data: sectionTokens = [], isLoading: loadingSection } = useQuery({
    queryKey: tokenQueryKeys.discover(category, chainId, filters),
    queryFn: () => fetchDiscoverTokens(category, 50, filters),
    enabled: category !== "favorite",
    staleTime: 15_000,
  });

  const { data: favoriteTokens = [], isLoading: loadingFavorites } = useQuery({
    queryKey: ["watchlist-tokens", address?.toLowerCase() ?? "", chainId],
    queryFn: () => fetchFavoriteTokens(address!),
    enabled: category === "favorite" && Boolean(address),
    staleTime: 15_000,
  });

  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: ["watchlist-ids", address?.toLowerCase() ?? ""],
    queryFn: () => fetchWatchlistIds(address!),
    enabled: Boolean(address),
    staleTime: 15_000,
  });

  const tokens = category === "favorite" ? favoriteTokens : sectionTokens;
  const isLoading = category === "favorite" ? loadingFavorites : loadingSection;
  const includeBaseTokens = category !== "favorite";

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (tokenId: string) => {
      if (!address) return;
      const isFav = favoriteIdSet.has(tokenId);
      await fetch("/api/watchlist", {
        method: isFav ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, walletAddress: address }),
      });
      await queryClient.invalidateQueries({ queryKey: ["watchlist-ids", address.toLowerCase()] });
      await queryClient.invalidateQueries({ queryKey: ["watchlist-tokens", address.toLowerCase(), chainId] });
    },
    [address, chainId, favoriteIdSet, queryClient]
  );

  useEffect(() => {
    if (category === "favorite" && !isConnected) {
      setCategory("top-token");
    }
  }, [category, isConnected]);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Compass className="h-7 w-7 text-primary" />
          Explore Tokens
        </h1>
        <p className="mt-1 text-muted-foreground">
          Market-style rankings for OPN, USDT, and FansPump tokens on OPN Network.
        </p>
      </header>

      <TokenGridCarousel
        title="Trending Tokens"
        icon={<Flame className="h-6 w-6 text-orange-500" />}
        description="Hot projects moving on FansPump right now."
        tokens={trendingTokens}
        isLoading={loadingTrending}
        viewAllHref="/leaderboard"
        variant="trending"
        fetchLimit={12}
        emptyMessage="No trending tokens yet."
      />

      <div className="space-y-6">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                category === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted hover:bg-muted/80"
              )}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {category === "favorite" && !isConnected ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Connect your wallet to see favorite tokens from your watchlist.{" "}
            <Link href="/watchlist" className="text-primary hover:underline">
              Open watchlist
            </Link>
          </div>
        ) : (
          <TokenMarketTable
            tokens={tokens}
            title={meta.label}
            description={meta.description}
            isLoading={isLoading}
            includeBaseTokens={includeBaseTokens}
            favoriteIds={favoriteIdSet}
            onToggleFavorite={toggleFavorite}
            emptyMessage={
              category === "favorite"
                ? "No favorites yet — star tokens in the table or on their profile pages."
                : "No tokens in this section yet."
            }
          />
        )}
      </div>

      <ExplorePromoCards />
    </div>
  );
}
