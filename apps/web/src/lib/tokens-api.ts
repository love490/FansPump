import { getActiveChainId } from "@/lib/chain-config/opn";
import { apiUrl } from "@/lib/api";
import type { TokenCardData } from "@/components/tokens/token-card";
import { buildHomePreviewSections } from "@/lib/tokens/home-sections";

export type PlatformStats = {
  tokenCount: number;
  verificationCount: number;
  voteCount: number;
  creatorCount: number;
  chainId: number;
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const res = await fetch(apiUrl("/api/stats"));
  if (!res.ok) throw new Error("Failed to load platform stats");
  const data = (await res.json()) as { stats: PlatformStats };
  return data.stats;
}

export type DiscoverFilters = {
  category?: string;
  verified?: boolean;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
};

function filterQuery(filters?: DiscoverFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.verified) params.set("verified", "true");
  if (filters.liquidityLocked) params.set("liquidityLocked", "true");
  if (filters.ownershipRenounced) params.set("ownershipRenounced", "true");
  const q = params.toString();
  return q ? `&${q}` : "";
}

/** Load home page token sections with API fallbacks. */
export async function fetchHomeTokens(chainId = getActiveChainId()): Promise<{
  market: TokenCardData[];
  trending: TokenCardData[];
  new: TokenCardData[];
}> {
  try {
    const res = await fetch(apiUrl(`/api/tokens/home?chainId=${chainId}`), { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        market?: TokenCardData[];
        trending?: TokenCardData[];
        new?: TokenCardData[];
      };
      return {
        market: data.market ?? [],
        trending: data.trending ?? [],
        new: data.new ?? [],
      };
    }
  } catch {
    /* fall through to legacy endpoints */
  }

  const [market, trending, newest, all] = await Promise.all([
    fetchDiscoverTokens("top-token", 50).catch(() => [] as TokenCardData[]),
    fetchDiscoverTokens("trending", 24).catch(() => [] as TokenCardData[]),
    fetchDiscoverTokens("new", 24).catch(() => [] as TokenCardData[]),
    fetchDiscoverTokens("all", 100).catch(() => [] as TokenCardData[]),
  ]);

  const pool = [...market, ...trending, ...newest, ...all];
  const { trending: trendingFilled, newest: newestFilled } = buildHomePreviewSections({
    market,
    trending,
    newest,
  });

  return {
    market: market.length > 0 ? market : all.slice(0, 50),
    trending: trendingFilled,
    new: newestFilled,
  };
}

/** Section-specific fetch for discover & landing previews. */
export async function fetchDiscoverTokens(
  section: string,
  limit = 24,
  filters?: DiscoverFilters
): Promise<TokenCardData[]> {
  const chainId = getActiveChainId();
  const fq = filterQuery(filters);

  if (section === "trending") {
    const res = await fetch(apiUrl(`/api/tokens?section=trending&limit=${limit}&chainId=${chainId}${fq}`));
    if (!res.ok) throw new Error("Failed to load trending tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  if (section === "all") {
    const res = await fetch(
      apiUrl(`/api/tokens?section=all&limit=${limit}&chainId=${chainId}${fq}`)
    );
    if (!res.ok) throw new Error("Failed to load tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  if (section === "latest" || section === "new") {
    const res = await fetch(apiUrl(`/api/tokens?section=new&limit=${limit}&chainId=${chainId}${fq}`));
    if (!res.ok) throw new Error("Failed to load latest tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  if (section === "verified") {
    const query = filterQuery({ ...filters, verified: true });
    const res = await fetch(apiUrl(`/api/tokens?section=new&limit=${limit}&chainId=${chainId}${query}`));
    if (!res.ok) throw new Error("Failed to load verified tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  if (
    section === "most-trusted" ||
    section === "top-builders" ||
    section === "top-token" ||
    section === "fastest-growing" ||
    section === "hot" ||
    section === "gainer" ||
    section === "loser" ||
    section === "recently-verified"
  ) {
    const res = await fetch(
      apiUrl(`/api/tokens?section=${encodeURIComponent(section)}&limit=${limit}&chainId=${chainId}${fq}`)
    );
    if (!res.ok) throw new Error("Failed to load tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  const res = await fetch(
    apiUrl(`/api/tokens?section=${encodeURIComponent(section)}&limit=${limit}&chainId=${chainId}${fq}`)
  );
  if (!res.ok) throw new Error("Failed to load tokens");
  const data = (await res.json()) as { tokens: TokenCardData[] };
  return data.tokens ?? [];
}

export const tokenQueryKeys = {
  myTokens: (wallet: string, chainId: number) => ["my-tokens", wallet.toLowerCase(), chainId] as const,
  home: (chainId: number) => ["home-tokens", chainId] as const,
  discover: (section: string, chainId: number, filters?: DiscoverFilters) =>
    ["discover-tokens", section, chainId, filters ?? {}] as const,
  stats: (chainId: number) => ["platform-stats", chainId] as const,
};
