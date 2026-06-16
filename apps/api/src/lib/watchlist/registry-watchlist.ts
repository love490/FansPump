import type { TokenCardData } from "@/lib/tokens/token-card-data";
import { getPopularRegistryTokens } from "@/lib/token-registry";
import { registryToTokenCardData } from "@/lib/tokens/market-metrics";

export function isRegistryTokenId(id: string): boolean {
  if (id.startsWith("native-")) return true;
  return getPopularRegistryTokens().some((token) => token.id === id);
}

export function registryKeyToTokenCard(registryKey: string): TokenCardData | null {
  const token = getPopularRegistryTokens().find((entry) => entry.id === registryKey);
  if (!token) return null;
  return registryToTokenCardData(token);
}
