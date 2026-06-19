import type { PoolRecord } from "@iopn/shared";

/** Standard 0.3% swap fee tier used for fee/APR estimates until on-chain fee indexing exists. */
const SWAP_FEE_BPS = 30;

export type PoolCategoryFilter = "all" | "wopn" | "stable";
export type PoolMetricFilter = "volume24h" | "volume7d" | "fees24h" | "providers";

export function parsePoolAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Indexed volume is treated as 24h until dedicated 24h pool stats exist. */
export function poolVolume24h(pool: PoolRecord): number {
  return parsePoolAmount(pool.totalVolume);
}

export function poolVolume7d(pool: PoolRecord): number {
  return poolVolume24h(pool) * 7;
}

export function poolFees24h(pool: PoolRecord): number {
  return poolVolume24h(pool) * (SWAP_FEE_BPS / 10_000);
}

export function poolApr24h(pool: PoolRecord): number {
  const tvl = parsePoolAmount(pool.totalLiquidity);
  const fees = poolFees24h(pool);
  if (tvl <= 0) return 0;
  return (fees / tvl) * 365 * 100;
}

export function isStablePool(pool: PoolRecord): boolean {
  return pool.pairType === "OPN_USDT" || pool.pairType === "OPN_USDC";
}

export function isWopnPool(pool: PoolRecord): boolean {
  return pool.pairType === "OPN_WOPN";
}

export function filterPoolsByCategory(
  pools: PoolRecord[],
  category: PoolCategoryFilter
): PoolRecord[] {
  if (category === "wopn") return pools.filter(isWopnPool);
  if (category === "stable") return pools.filter(isStablePool);
  return pools;
}

export function sortPoolsByMetric(pools: PoolRecord[], metric: PoolMetricFilter): PoolRecord[] {
  return [...pools].sort((a, b) => {
    const metricValue = (pool: PoolRecord) => {
      if (metric === "providers") return pool.providerCount;
      if (metric === "volume7d") return poolVolume7d(pool);
      if (metric === "fees24h") return poolFees24h(pool);
      return poolVolume24h(pool);
    };
    return metricValue(b) - metricValue(a);
  });
}

export function formatApr(value: number): string {
  if (value <= 0) return "0%";
  if (value >= 100) return `${value.toFixed(0)}%`;
  return `${value.toFixed(2)}%`;
}

export function poolMetricValue(pool: PoolRecord, metric: PoolMetricFilter): number {
  if (metric === "providers") return pool.providerCount;
  if (metric === "volume7d") return poolVolume7d(pool);
  if (metric === "fees24h") return poolFees24h(pool);
  return poolVolume24h(pool);
}
