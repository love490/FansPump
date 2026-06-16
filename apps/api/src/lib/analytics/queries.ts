import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";

export async function getGlobalAnalytics() {
  const chainId = getActiveChainId();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [tokenCount, volumeAgg, tradeCount, activeUsers, treasury] = await Promise.all([
    prisma.tokenProject.count({ where: { chainId } }),
    prisma.tokenProject.aggregate({
      where: { chainId },
      _sum: { volumeTotal: true },
    }),
    prisma.swapActivity.count(),
    prisma.swapActivity.findMany({
      where: { blockTime: { gte: since } },
      distinct: ["traderAddress"],
      select: { traderAddress: true },
    }),
    prisma.platformTreasuryLedger.findUnique({ where: { id: "global" } }),
  ]);

  return {
    totalTokens: tokenCount,
    totalVolume: volumeAgg._sum.volumeTotal ?? 0,
    totalTrades: tradeCount,
    activeUsers24h: activeUsers.length,
    treasuryTotalWei: treasury?.totalWei ?? "0",
    chainId,
  };
}

export async function getCreatorEarningsTotal(wallet: string): Promise<string> {
  const rows = await prisma.creatorEarning.findMany({
    where: { creatorAddress: { equals: wallet, mode: "insensitive" } },
    select: { amount: true },
  });

  let total = 0n;
  for (const row of rows) {
    try {
      total += BigInt(row.amount || "0");
    } catch {
      /* skip invalid */
    }
  }

  return total.toString();
}
