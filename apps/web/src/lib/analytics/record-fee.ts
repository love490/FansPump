import { prisma } from "@iopn/database";
import { splitTradingFee, addWeiStrings, weiToOpnFloat } from "@/lib/analytics/fee-split";

export type RecordFeeInput = {
  tokenAddress: string;
  creatorAddress: string;
  feeWei: bigint;
  txHash?: string;
  logIndex?: number;
  blockNumber?: bigint;
  blockTime?: Date;
};

/**
 * Off-chain fee ledger — does NOT touch swap execution or on-chain balances.
 * Splits: 50% creator, 30% treasury, 20% pool (simulated pool share).
 */
export async function recordTradingFee(input: RecordFeeInput): Promise<{ recorded: boolean }> {
  const tokenAddress = input.tokenAddress.toLowerCase();
  const creatorAddress = input.creatorAddress.toLowerCase();

  const token = await prisma.tokenProject.findUnique({
    where: { contractAddress: tokenAddress },
    include: { poolStats: true },
  });

  if (!token) return { recorded: false };

  if (input.txHash != null && input.logIndex != null) {
    const existing = await prisma.creatorEarning.findUnique({
      where: {
        txHash_logIndex: { txHash: input.txHash, logIndex: input.logIndex },
      },
    });
    if (existing) return { recorded: false };
  }

  const { creatorWei, treasuryWei, poolWei } = splitTradingFee(input.feeWei);
  const blockTime = input.blockTime ?? new Date();
  const volumeOpn = weiToOpnFloat(input.feeWei);

  await prisma.$transaction(async (tx) => {
    await tx.creatorEarning.create({
      data: {
        creatorAddress,
        tokenId: token.id,
        tokenAddress,
        amount: creatorWei.toString(),
        earningType: "TRADING_FEE",
        txHash: input.txHash,
        logIndex: input.logIndex,
        blockNumber: input.blockNumber,
      },
    });

    await tx.platformTreasuryLedger.upsert({
      where: { id: "global" },
      create: { id: "global", totalWei: treasuryWei.toString() },
      update: {
        totalWei: addWeiStrings(
          (
            await tx.platformTreasuryLedger.findUnique({ where: { id: "global" } })
          )?.totalWei ?? "0",
          treasuryWei
        ),
      },
    });

    const poolStats = token.poolStats;
    const nextPoolValue = addWeiStrings(poolStats?.accumulatedPoolValue ?? "0", poolWei);

    await tx.tokenPoolStats.upsert({
      where: { tokenId: token.id },
      create: {
        tokenId: token.id,
        tokenAddress,
        accumulatedPoolValue: poolWei.toString(),
        poolReserveEstimate: "0",
      },
      update: {
        accumulatedPoolValue: nextPoolValue,
      },
    });

    const poolStrength = Math.min(100, weiToOpnFloat(BigInt(nextPoolValue)) * 10);

    await tx.tokenProject.update({
      where: { id: token.id },
      data: {
        volumeTotal: { increment: volumeOpn },
        volume24h: { increment: volumeOpn },
        txCountTotal: { increment: 1 },
        txCount24h: { increment: 1 },
        lastActivity: blockTime,
        poolStrength,
        trendingScore: Date.now(),
      },
    });
  });

  return { recorded: true };
}
