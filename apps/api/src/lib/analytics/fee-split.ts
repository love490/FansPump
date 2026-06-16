const OPN_DECIMALS = 18;

export const FEE_SPLIT = {
  creatorBps: 5000,
  treasuryBps: 3000,
  poolBps: 2000,
} as const;

export function weiToOpnFloat(wei: bigint): number {
  if (wei <= 0n) return 0;
  return Number(wei) / 10 ** OPN_DECIMALS;
}

export function addWeiStrings(a: string, b: bigint | string): string {
  const left = BigInt(a || "0");
  const right = typeof b === "bigint" ? b : BigInt(b || "0");
  return (left + right).toString();
}

export function splitTradingFee(feeWei: bigint): {
  creatorWei: bigint;
  treasuryWei: bigint;
  poolWei: bigint;
} {
  if (feeWei <= 0n) {
    return { creatorWei: 0n, treasuryWei: 0n, poolWei: 0n };
  }

  const creatorWei = (feeWei * BigInt(FEE_SPLIT.creatorBps)) / 10000n;
  const treasuryWei = (feeWei * BigInt(FEE_SPLIT.treasuryBps)) / 10000n;
  const poolWei = feeWei - creatorWei - treasuryWei;

  return { creatorWei, treasuryWei, poolWei };
}
