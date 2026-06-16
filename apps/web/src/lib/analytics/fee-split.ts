const OPN_DECIMALS = 18;

export function weiToOpnFloat(wei: bigint): number {
  if (wei <= 0n) return 0;
  return Number(wei) / 10 ** OPN_DECIMALS;
}
