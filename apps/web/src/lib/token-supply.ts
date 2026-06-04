import { formatUnits, parseEther } from "viem";
import { MAX_TAX_BPS } from "@iopn/shared";

export type SupplyInputUnit = "percent" | "tokens";

/** Convert a human supply + percent (e.g. "1" or "1%") to token wei amount. */
export function percentOfTokenSupply(supply: string, percent: string): bigint {
  const supplyWei = parseEther(supply || "0");
  const pct = Number(percent.replace("%", "").trim());
  if (!Number.isFinite(pct) || pct <= 0 || supplyWei === 0n) return 0n;
  return (supplyWei * BigInt(Math.round(pct * 100))) / 10_000n;
}

/** Resolve a limit as either % of total supply or an absolute token amount. */
export function toSupplyWei(supply: string, unit: SupplyInputUnit, value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) return 0n;
  if (unit === "percent") return percentOfTokenSupply(supply, trimmed);
  try {
    const wei = parseEther(trimmed);
    return wei > 0n ? wei : 0n;
  } catch {
    return 0n;
  }
}

/** Human-readable % of supply for a wei amount (e.g. "1.25"). */
export function percentFromSupplyWei(supply: string, amountWei: bigint): string {
  const supplyWei = parseEther(supply || "0");
  if (supplyWei === 0n || amountWei === 0n) return "0";
  const pct = Number((amountWei * 10000n) / supplyWei) / 100;
  return pct.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Format wei as a whole-ish token count for hints. */
export function formatTokenAmountFromWei(wei: bigint): string {
  if (wei === 0n) return "0";
  const s = formatUnits(wei, 18);
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/** Map a token slice of total supply to tax-allocation bps (must sum to 10_000 on-chain). */
export function tokenAmountToBps(supply: string, tokenAmount: string): number {
  const supplyWei = parseEther(supply || "0");
  if (supplyWei === 0n) return 0;
  try {
    const amountWei = parseEther(tokenAmount.trim() || "0");
    if (amountWei <= 0n) return 0;
    return Number((amountWei * 10000n) / supplyWei);
  } catch {
    return 0;
  }
}

/** Map tax-allocation bps to a token amount string for the current supply. */
export function bpsToTokenAmountString(supply: string, bps: number): string {
  const supplyWei = parseEther(supply || "0");
  if (supplyWei === 0n || bps <= 0) return "";
  const amountWei = (supplyWei * BigInt(bps)) / 10000n;
  return formatTokenAmountFromWei(amountWei);
}

/** Tax charged per 1 whole token transferred → basis points (max 500). */
export function taxPerTokenToBps(tokensPerOneToken: string): number {
  try {
    const taxWei = parseEther(tokensPerOneToken.trim() || "0");
    const one = parseEther("1");
    if (taxWei <= 0n || one === 0n) return 0;
    const bps = Number((taxWei * 10000n) / one);
    return Math.min(Math.max(0, Math.round(bps)), MAX_TAX_BPS);
  } catch {
    return 0;
  }
}

/** Basis points → tokens taxed per 1 token transferred. */
export function bpsToTaxPerToken(bps: number): string {
  if (bps <= 0) return "";
  const taxWei = (parseEther("1") * BigInt(bps)) / 10000n;
  return formatTokenAmountFromWei(taxWei);
}

/** Transfer-tax percent (e.g. "2.5") → basis points (capped at MAX_TAX_BPS). */
export function percentToBps(percent: string): number {
  const pct = Number(percent.replace("%", "").trim());
  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.min(Math.round(pct * 100), MAX_TAX_BPS);
}

/** Tax-wallet split percent (e.g. "20") → basis points (max 10_000). */
export function percentToAllocationBps(percent: string): number {
  const pct = Number(percent.replace("%", "").trim());
  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.min(Math.round(pct * 100), 10_000);
}

/** Basis points → percent string for inputs. */
export function bpsToPercentString(bps: number): string {
  return String(bps / 100);
}
