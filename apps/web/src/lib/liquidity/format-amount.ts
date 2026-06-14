import { formatUnits } from "viem";

/** Standard display precision for LP, OPN, and pool token amounts. */
export const LIQUIDITY_AMOUNT_DECIMALS = 3;

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
