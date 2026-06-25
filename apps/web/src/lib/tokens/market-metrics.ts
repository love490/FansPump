import type { TokenCardData } from "@/components/tokens/token-card";
import { getPopularRegistryTokens, type RegistryToken } from "@/lib/token-registry";
import { NATIVE_OPN_ID } from "@/lib/tokens/token-route";

export type SpotPriceMap = Record<string, number>;

export type MarketTableRow = {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  contractAddress: string;
  logoUrl?: string | null;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  isBaseToken?: boolean;
  canFavorite: boolean;
};

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

function seededChange(seed: number, scale = 8): number {
  const raw = ((seed % 1000) - 500) / 100;
  return Math.round(raw * (scale / 10) * 100) / 100;
}

function stablecoinMetrics(symbol: string): Pick<MarketTableRow, "price" | "change1h" | "change24h" | "change7d"> {
  const seed = hashSeed(symbol);
  return {
    price: symbol === "USDT" || symbol === "USDC" ? 1 : seededFloat(seed, 0.98, 1.02),
    change1h: seededChange(seed, 0.2),
    change24h: seededChange(seed >> 3, 0.3),
    change7d: seededChange(seed >> 5, 0.5),
  };
}

function derivePrice(token: TokenCardData, seed: number): number {
  if (token.symbol.toUpperCase() === "USDT" || token.symbol.toUpperCase() === "USDC") return 1;
  if (token.marketCap && token.holderCount > 0) {
    const implied = token.marketCap / Math.max(token.holderCount, 50);
    if (implied > 0 && Number.isFinite(implied)) return implied;
  }
  if (token.poolStrength && token.poolStrength > 0) {
    return Math.max(token.poolStrength / 1_000_000, 0.000001);
  }
  if (token.volumeTotal && token.volume24h) {
    return Math.max(token.volume24h / Math.max(token.txCount24h ?? 1, 1), 0.00001);
  }
  return seededFloat(seed, 0.00001, 12);
}

function deriveChange(token: TokenCardData, seed: number, hours: 1 | 24 | 168): number {
  if (token.volume24h != null && token.volumeTotal != null && token.volumeTotal > 0 && hours === 24) {
    const ratio = token.volume24h / token.volumeTotal;
    const momentum = (ratio - 0.15) * 40;
    return Math.round(Math.max(-35, Math.min(35, momentum)) * 100) / 100;
  }
  const shift = hours === 1 ? 0 : hours === 24 ? 3 : 5;
  return seededChange(seed >> shift, hours === 1 ? 4 : hours === 24 ? 10 : 18);
}

function deriveMarketCap(token: TokenCardData, price: number, seed: number): number {
  if (token.marketCap && token.marketCap > 0) return token.marketCap;
  const holders = Math.max(token.holderCount ?? 0, 100);
  const supplyFactor = seededFloat(seed >> 2, 500_000, 50_000_000);
  return price * holders * (supplyFactor / 1_000_000);
}

function deriveVolume(token: TokenCardData, seed: number): number {
  if (token.volume24h && token.volume24h > 0) return token.volume24h;
  if (token.volumeTotal && token.volumeTotal > 0) return token.volumeTotal * seededFloat(seed >> 4, 0.02, 0.12);
  return seededFloat(seed >> 6, 10_000, 5_000_000);
}

export function registryToTokenCardData(token: RegistryToken): TokenCardData {
  const seed = hashSeed(token.id);
  const isStable = token.category === "stablecoin";
  const baseVolume = isStable ? 45_000_000 : seededFloat(seed, 500_000, 8_000_000);
  return {
    id: token.id,
    contractAddress: token.isNative ? NATIVE_OPN_ID : token.contractAddress,
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

function resolveSpotPrice(token: TokenCardData, spotPrices?: SpotPriceMap): number | null {
  if (!spotPrices) return null;
  const sym = token.symbol.toUpperCase();
  if (spotPrices[sym] != null && spotPrices[sym] > 0) return spotPrices[sym];
  const addr = (token.contractAddress || "").toLowerCase();
  if (addr && spotPrices[addr] != null && spotPrices[addr] > 0) return spotPrices[addr];
  if (token.id === NATIVE_OPN_ID && spotPrices.OPN != null && spotPrices.OPN > 0) {
    return spotPrices.OPN;
  }
  return null;
}

function isRegistryOrNativeToken(token: TokenCardData): boolean {
  if (token.id.startsWith("native-")) return true;
  return getPopularRegistryTokens().some((r) => r.id === token.id);
}

export function tokenToMarketRow(
  token: TokenCardData,
  rank: number,
  spotPrices?: SpotPriceMap
): MarketTableRow {
  const key = (token.contractAddress || token.id || token.symbol).toLowerCase();
  const seed = hashSeed(key);
  const isStable =
    token.symbol.toUpperCase() === "USDT" ||
    token.symbol.toUpperCase() === "USDC" ||
    token.symbol.toUpperCase() === "OPNT";

  const spotPrice = resolveSpotPrice(token, spotPrices);
  const stable = isStable && spotPrice == null ? stablecoinMetrics(token.symbol) : null;
  const price = spotPrice ?? stable?.price ?? derivePrice(token, seed);
  const change1h = stable?.change1h ?? deriveChange(token, seed, 1);
  const change24h = stable?.change24h ?? deriveChange(token, seed, 24);
  const change7d = stable?.change7d ?? deriveChange(token, seed, 168);
  const isBaseToken = isRegistryOrNativeToken(token);

  return {
    id: token.id,
    rank,
    name: token.name,
    symbol: token.symbol,
    contractAddress: token.contractAddress,
    logoUrl: token.logoUrl,
    price,
    change1h,
    change24h,
    change7d,
    marketCap: deriveMarketCap(token, price, seed),
    volume24h: deriveVolume(token, seed),
    isBaseToken,
    canFavorite: Boolean(token.id),
  };
}

export function buildMarketTableRows(
  tokens: TokenCardData[],
  options?: { includeBaseTokens?: boolean; spotPrices?: SpotPriceMap }
): MarketTableRow[] {
  const includeBase = options?.includeBaseTokens ?? true;
  const spotPrices = options?.spotPrices;
  const baseCards = includeBase ? getPopularRegistryTokens().map(registryToTokenCardData) : [];
  const seen = new Set<string>();
  const merged: TokenCardData[] = [];

  // Prefer indexed project tokens so favorites use DB ids, not registry ids.
  for (const token of [...tokens, ...baseCards]) {
    const key = (token.contractAddress || token.id || token.symbol).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(token);
  }

  return merged.map((token, index) => tokenToMarketRow(token, index + 1, spotPrices));
}

export function formatMarketPrice(value: number): string {
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (value >= 1) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (value >= 0.0001) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  }
  return `$${value.toExponential(2)}`;
}

export function formatMarketCompact(value: number): string {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatPercentChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export type MarketSortKey =
  | "rank"
  | "price"
  | "change1h"
  | "change24h"
  | "change7d"
  | "marketCap"
  | "volume24h";

export function sortMarketRows(rows: MarketTableRow[], key: MarketSortKey, dir: "asc" | "desc"): MarketTableRow[] {
  const sorted = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return 0;
  });
  if (dir === "desc") sorted.reverse();
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}
