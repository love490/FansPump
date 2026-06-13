"use client";

import { useQuery } from "@tanstack/react-query";
import { TokenMarketTable } from "@/components/tokens/token-market-table";
import { ExplorePromoCards } from "@/components/explore/explore-promo-cards";
import { fetchDiscoverTokens, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";

const HOME_TABLE_LIMIT = 500;

export function HomeMarketSection() {
  const chainId = getActiveChainId();
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: tokenQueryKeys.discover("top-token", chainId, {}),
    queryFn: () => fetchDiscoverTokens("top-token", HOME_TABLE_LIMIT, {}),
    staleTime: 15_000,
  });

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="space-y-6">
        <header>
          <h2 className="text-lg font-bold sm:text-xl">Market chart</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Market-style rankings for OPN, USDT, and FansPump tokens on OPN Network.
          </p>
        </header>
        <TokenMarketTable
          tokens={tokens}
          title="Top Token"
          description="Highest-ranked tokens by trust and volume."
          isLoading={isLoading}
          includeBaseTokens
          emptyMessage="No tokens to display yet."
        />
      </section>
      <ExplorePromoCards />
    </div>
  );
}
