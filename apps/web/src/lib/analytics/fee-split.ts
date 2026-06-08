/** Off-chain trading fee split (basis points, must sum to 10_000). */
export const FEE_SPLIT = {
  creatorBps: 5000,
  treasuryBps: 3000,
  poolBps: 2000,
} as const;

export type FeeSplitAmounts = {
  creatorWei: bigint;
  treasuryWei: bigint;
  poolWei: bigint;
};

export function splitTradingFee(feeWei: bigint): FeeSplitAmounts {
  const creatorWei = (feeWei * BigInt(FEE_SPLIT.creatorBps)) / 10_000n;
  const treasuryWei = (feeWei * BigInt(FEE_SPLIT.treasuryBps)) / 10_000n;
  const poolWei = feeWei - creatorWei - treasuryWei;
  return { creatorWei, treasuryWei, poolWei };
}

export function addWeiStrings(a: string, b: bigint): string {
  const current = BigInt(a || "0");
  return (current + b).toString();
}

export function weiToOpnFloat(wei: bigint): number {
  return Number(wei) / 1e18;
}
