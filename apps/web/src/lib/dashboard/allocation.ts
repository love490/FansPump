import type { PortfolioAsset } from "@/lib/dashboard/wallet-balance";

export type AllocationCategory = "opn" | "stablecoins" | "community" | "lp";

export const ALLOCATION_LABELS: Record<AllocationCategory, string> = {
  opn: "OPN",
  stablecoins: "Stablecoins",
  community: "Community tokens",
  lp: "LP tokens",
};

/** Tailwind text colours, used as `currentColor` for donut segments and legend dots. */
export const ALLOCATION_COLORS: Record<AllocationCategory, string> = {
  opn: "text-primary",
  stablecoins: "text-emerald-500",
  community: "text-violet-500",
  lp: "text-amber-500",
};

const STABLE_SYMBOLS = new Set(["USDT", "USDC", "DAI", "USDE"]);
const OPN_SYMBOLS = new Set(["OPN", "WOPN", "OPNT"]);

export function categorizeAsset(asset: PortfolioAsset): AllocationCategory {
  if (asset.isLp) return "lp";
  const symbol = asset.symbol.toUpperCase();
  if (asset.isNative || OPN_SYMBOLS.has(symbol)) return "opn";
  if (STABLE_SYMBOLS.has(symbol)) return "stablecoins";
  return "community";
}

export type AllocationSlice = {
  category: AllocationCategory;
  label: string;
  colorClass: string;
  usdValue: number;
  percent: number;
  count: number;
};

/** Portfolio value grouped by asset class, largest first. Zero-value groups are dropped. */
export function buildAllocation(assets: PortfolioAsset[]): {
  slices: AllocationSlice[];
  totalUsd: number;
} {
  const totals = new Map<AllocationCategory, { usd: number; count: number }>();

  for (const asset of assets) {
    const category = categorizeAsset(asset);
    const entry = totals.get(category) ?? { usd: 0, count: 0 };
    entry.usd += Number.isFinite(asset.usdValue) ? asset.usdValue : 0;
    entry.count += 1;
    totals.set(category, entry);
  }

  const totalUsd = [...totals.values()].reduce((acc, entry) => acc + entry.usd, 0);

  const slices = [...totals.entries()]
    .filter(([, entry]) => entry.usd > 0)
    .map(([category, entry]) => ({
      category,
      label: ALLOCATION_LABELS[category],
      colorClass: ALLOCATION_COLORS[category],
      usdValue: entry.usd,
      percent: totalUsd > 0 ? (entry.usd / totalUsd) * 100 : 0,
      count: entry.count,
    }))
    .sort((a, b) => b.usdValue - a.usdValue);

  return { slices, totalUsd };
}
