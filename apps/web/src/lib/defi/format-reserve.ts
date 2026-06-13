/** Format on-chain reserve / liquidity wei strings for display. */
export function formatReserve(value: string, decimals = 18): string {
  try {
    const n = BigInt(value || "0");
    if (n === 0n) return "0";
    if (n >= 10n ** BigInt(decimals)) {
      const scaled = Number(n) / 10 ** decimals;
      if (scaled >= 1_000_000) return `${(scaled / 1_000_000).toFixed(2)}M`;
      if (scaled >= 1_000) return `${(scaled / 1_000).toFixed(2)}K`;
      return scaled.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    return n.toString();
  } catch {
    return value || "0";
  }
}

export function formatTokenAmount(value: string, decimals = 18, symbol?: string): string {
  const formatted = formatReserve(value, decimals);
  return symbol ? `${formatted} ${symbol}` : formatted;
}
