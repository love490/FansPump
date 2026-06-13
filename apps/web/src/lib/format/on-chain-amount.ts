/** Format wei-like bigint strings for display (defaults to 18 decimals). */
export function formatOnChainAmount(value: string, decimals = 18): string {
  try {
    const n = BigInt(value || "0");
    if (n === 0n) return "0";
    const scaled = Number(n) / 10 ** decimals;
    if (!Number.isFinite(scaled)) return "0";
    if (scaled >= 1_000_000_000) return `${(scaled / 1_000_000_000).toFixed(2)}B`;
    if (scaled >= 1_000_000) return `${(scaled / 1_000_000).toFixed(2)}M`;
    if (scaled >= 1_000) return `${(scaled / 1_000).toFixed(2)}K`;
    return scaled.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return value || "0";
  }
}
