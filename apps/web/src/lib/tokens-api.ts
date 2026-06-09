import { getActiveChainId } from "@/lib/chain-config/opn";
import type { TokenCardData } from "@/components/tokens/token-card";

export type PlatformStats = {
  tokenCount: number;
  verificationCount: number;
  voteCount: number;
  creatorCount: number;
  chainId: number;
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const res = await fetch("/api/stats");
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

/** Section-specific fetch for discover & landing previews. */
export async function fetchDiscoverTokens(
  section: string,
  limit = 24,
  filters?: DiscoverFilters
): Promise<TokenCardData[]> {
  const chainId = getActiveChainId();
  const fq = filterQuery(filters);

  if (section === "trending") {
    const res = await fetch(`/api/tokens/trending?limit=${limit}&chainId=${chainId}${fq}`);
    if (!res.ok) throw new Error("Failed to load trending tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  if (section === "latest" || section === "new") {
    const res = await fetch(`/api/tokens/latest?limit=${limit}&chainId=${chainId}${fq}`);
    if (!res.ok) throw new Error("Failed to load latest tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  if (section === "verified") {
    const query = filterQuery({ ...filters, verified: true });
    const res = await fetch(`/api/tokens/latest?limit=${limit}&chainId=${chainId}${query}`);
    if (!res.ok) throw new Error("Failed to load verified tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  const res = await fetch(
    `/api/tokens?section=${encodeURIComponent(section)}&limit=${limit}&chainId=${chainId}${fq}`
  );
  if (!res.ok) throw new Error("Failed to load tokens");
  const data = (await res.json()) as { tokens: TokenCardData[] };
  return data.tokens ?? [];
}

export const tokenQueryKeys = {
  myTokens: (wallet: string, chainId: number) => ["my-tokens", wallet.toLowerCase(), chainId] as const,
  discover: (section: string, chainId: number, filters?: DiscoverFilters) =>
    ["discover-tokens", section, chainId, filters ?? {}] as const,
  stats: (chainId: number) => ["platform-stats", chainId] as const,
};
