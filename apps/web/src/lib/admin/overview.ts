import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";

export async function getAdminOverview() {
  const chainId = getActiveChainId();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    tokenCount,
    verifiedCount,
    treasury,
    volumeAgg,
    volume24hAgg,
    volume7dRows,
    activeUsers,
    earningRows,
    recentTokens,
    recentSwaps,
  ] = await Promise.all([
    prisma.tokenProject.count({ where: { chainId } }),
    prisma.tokenProject.count({
      where: { chainId, verificationStatus: "APPROVED" },
    }),
    prisma.platformTreasuryLedger.findUnique({ where: { id: "global" } }),
    prisma.tokenProject.aggregate({
      where: { chainId },
      _sum: { volumeTotal: true },
    }),
    prisma.tokenProject.aggregate({
      where: { chainId },
      _sum: { volume24h: true },
    }),
    prisma.swapActivity.findMany({
      where: { blockTime: { gte: since7d } },
      select: { volumeWei: true },
    }),
    prisma.swapActivity.findMany({
      where: { blockTime: { gte: since24h } },
      distinct: ["traderAddress"],
      select: { traderAddress: true },
    }),
    prisma.creatorEarning.findMany({ select: { amount: true } }),
    prisma.tokenProject.findMany({
      where: { chainId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        name: true,
        symbol: true,
        contractAddress: true,
        creatorAddress: true,
        createdAt: true,
      },
    }),
    prisma.swapActivity.findMany({
      orderBy: { blockTime: "desc" },
      take: 8,
      select: {
        tokenAddress: true,
        traderAddress: true,
        volumeWei: true,
        txHash: true,
        blockTime: true,
      },
    }),
  ]);

  let volume7d = 0;
  for (const row of volume7dRows) {
    volume7d += weiToOpnFloat(BigInt(row.volumeWei));
  }

  let creatorEarningsWei = 0n;
  for (const e of earningRows) {
    creatorEarningsWei += BigInt(e.amount);
  }

  const platformRevenue = treasury ? weiToOpnFloat(BigInt(treasury.totalWei)) : 0;

  return {
    totalTokensCreated: tokenCount,
    totalVerifiedTokens: verifiedCount,
    totalPlatformRevenue: platformRevenue,
    totalTradingVolume: volumeAgg._sum.volumeTotal ?? 0,
    volume24h: volume24hAgg._sum.volume24h ?? 0,
    volume7d,
    totalActiveUsers: activeUsers.length,
    totalCreatorEarnings: weiToOpnFloat(creatorEarningsWei),
    latestTokenCreations: recentTokens.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
    latestTransactions: recentSwaps.map((s) => ({
      ...s,
      volumeOpn: weiToOpnFloat(BigInt(s.volumeWei)),
      blockTime: s.blockTime.toISOString(),
    })),
  };
}
