"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Flame } from "lucide-react";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";

function usePreviewTokens(section: string, limit: number, filters?: DiscoverFilters) {
  const chainId = getActiveChainId();
  return useQuery({
    queryKey: tokenQueryKeys.discover(section, chainId, filters),
    queryFn: () => fetchDiscoverTokens(section, limit, filters),
    staleTime: 15_000,
  });
}

export function LandingTrendingPreview() {
  const { data: tokens = [], isLoading } = usePreviewTokens("trending", 24);
  return (
    <TokenGridCarousel
      title="Trending Tokens"
      icon={<Flame className="h-6 w-6 text-orange-500" />}
      tokens={tokens}
      isLoading={isLoading}
      viewAllHref="/discover?section=trending"
      variant="trending"
      fetchLimit={24}
      emptyMessage="No tokens yet — be the first to launch."
    />
  );
}

export function LandingVerifiedPreview() {
  const { data: tokens = [], isLoading } = usePreviewTokens("verified", 24, { verified: true });
  return (
    <TokenGridCarousel
      id="verified"
      title="Verified Projects"
      icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
      tokens={tokens}
      isLoading={isLoading}
      viewAllHref="/discover?section=verified&verified=true"
      variant="grid"
      fetchLimit={24}
      emptyMessage="No verified projects yet."
    />
  );
}

export function LandingNewlyCreatedPreview() {
  const { data: tokens = [], isLoading } = usePreviewTokens("new", 24);
  return (
    <TokenGridCarousel
      title="Newly Created"
      icon={<span className="text-xl">🆕</span>}
      tokens={tokens}
      isLoading={isLoading}
      viewAllHref="/discover?section=new"
      variant="grid"
      fetchLimit={24}
      emptyMessage="No tokens yet — be the first to launch."
    />
  );
}
