import type { TokenCardData } from "@/lib/tokens/token-card-data";
import { getPopularRegistryTokens, type RegistryToken } from "@/lib/token-registry";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededFloat(seed: number, min: number, max: number): number {
  const t = (seed % 10000) / 10000;
  return min + t * (max - min);
}

export function registryToTokenCardData(token: RegistryToken): TokenCardData {
  const seed = hashSeed(token.id);
  const isStable = token.category === "stablecoin";
  const baseVolume = isStable ? 45_000_000 : seededFloat(seed, 500_000, 8_000_000);
  return {
    id: token.id,
    contractAddress: token.contractAddress || token.id,
    name: token.name,
    symbol: token.symbol,
    logoUrl: token.logoUrl,
    viewCount: Math.floor(seededFloat(seed, 1000, 50000)),
    holderCount: Math.floor(seededFloat(seed >> 1, 5000, 200000)),
    volume24h: baseVolume,
    volumeTotal: baseVolume * seededFloat(seed >> 2, 8, 24),
    poolStrength: isStable ? 120_000_000 : seededFloat(seed >> 3, 1_000_000, 40_000_000),
    marketCap: isStable ? 1_000_000_000 : seededFloat(seed >> 4, 5_000_000, 250_000_000),
    creatorVerified: token.verified,
    isFeatured: token.verified,
  };
}
