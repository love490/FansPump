import { formatUnits } from "viem";

/** Standard display precision for LP, OPN, and pool token amounts. */
export const LIQUIDITY_AMOUNT_DECIMALS = 4;

export function formatLiquidityAmount(
  value: string | number,
  maxFractionDigits = LIQUIDITY_AMOUNT_DECIMALS
): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value).trim() || "0";
  if (n === 0) return "0";
  if (n > 0 && n < 10 ** -maxFractionDigits) {
    return `<${(10 ** -maxFractionDigits).toFixed(maxFractionDigits)}`;
  }
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

export function formatLiquidityAmountFromWei(
  amount: bigint,
  decimals: number,
  maxFractionDigits = LIQUIDITY_AMOUNT_DECIMALS
): string {
  return formatLiquidityAmount(formatUnits(amount, decimals), maxFractionDigits);
}

export function formatTokenLpPositionLabel(
  lpBalance: bigint,
  lpDecimals: number,
  tokenSymbol: string,
  pairLabel: string
): string {
  return `${formatLiquidityAmountFromWei(lpBalance, lpDecimals)} ${tokenSymbol}/${pairLabel}`;
}

export function formatBaseLpPositionLabel(
  lpBalance: bigint,
  lpDecimals: number,
  pairLabel: string
): string {
  return `${formatLiquidityAmountFromWei(lpBalance, lpDecimals)} ${pairLabel}`;
}

/** Compact summary for stat cards, e.g. "14142.1356 WFDI/OPN · +2 more". */
export function summarizeLpDisplayParts(parts: string[], maxShown = 2): string {
  if (parts.length === 0) return "None yet";
  const head = parts.slice(0, maxShown).join(" · ");
  if (parts.length <= maxShown) return head;
  return `${head} · +${parts.length - maxShown} more`;
}
