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

export async function fetchDiscoverTokens(
  section: string,
  limit = 24
): Promise<TokenCardData[]> {
  const chainId = getActiveChainId();

  if (section === "trending") {
    const res = await fetch(
      `/api/tokens/trending?limit=${limit}&chainId=${chainId}`
    );
    if (!res.ok) throw new Error("Failed to load trending tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  if (section === "latest" || section === "new") {
    const res = await fetch(
      `/api/tokens/latest?limit=${limit}&chainId=${chainId}`
    );
    if (!res.ok) throw new Error("Failed to load latest tokens");
    const data = (await res.json()) as { tokens: TokenCardData[] };
    return data.tokens ?? [];
  }

  const res = await fetch(`/api/tokens?section=${encodeURIComponent(section)}&limit=${limit}&chainId=${chainId}`);
  if (!res.ok) throw new Error("Failed to load tokens");
  const data = (await res.json()) as { tokens: TokenCardData[] };
  return data.tokens ?? [];
}

export const tokenQueryKeys = {
  myTokens: (wallet: string, chainId: number) => ["my-tokens", wallet.toLowerCase(), chainId] as const,
  discover: (section: string, chainId: number) => ["discover-tokens", section, chainId] as const,
  stats: (chainId: number) => ["platform-stats", chainId] as const,
};
