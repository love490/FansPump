import { parseEther } from "viem";

/** Convert a human supply + percent (e.g. "1" or "1%") to token wei amount. */
export function percentOfTokenSupply(supply: string, percent: string): bigint {
  const supplyWei = parseEther(supply || "0");
  const pct = Number(percent.replace("%", "").trim());
  if (!Number.isFinite(pct) || pct <= 0 || supplyWei === 0n) return 0n;
  return (supplyWei * BigInt(Math.round(pct * 100))) / 10_000n;
}
