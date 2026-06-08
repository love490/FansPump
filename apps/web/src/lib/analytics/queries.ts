import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";

export type TokenAnalyticsResponse = {
  volume24h: number;
  volumeTotal: number;
  trades24h: number;
  tradesTotal: number;
  uniqueTraders: number;
  holders: number;
  creatorEarnings: string;
  poolShareValue: string;
  liquidityEstimate: number;
  poolStrength: number;
  lastActivity: string | null;
};

export async function getTokenAnalytics(contractAddress: string): Promise<TokenAnalyticsResponse | null> {
  const address = contractAddress.toLowerCase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const token = await prisma.tokenProject.findUnique({
    where: { contractAddress: address },
    include: { poolStats: true },
  });

  if (!token) return null;

  const [earningRows, uniqueTraders, trades24h] = await Promise.all([
    prisma.creatorEarning.findMany({
      where: { tokenId: token.id },
      select: { amount: true },
    }),
    prisma.swapActivity.findMany({
      where: { tokenId: token.id },
      distinct: ["traderAddress"],
      select: { traderAddress: true },
    }),
    prisma.swapActivity.count({
      where: { tokenId: token.id, blockTime: { gte: since } },
    }),
  ]);

  let creatorEarningsWei = 0n;
  for (const e of earningRows) {
    creatorEarningsWei += BigInt(e.amount);
  }

  return {
    volume24h: token.volume24h,
    volumeTotal: token.volumeTotal,
    trades24h,
    tradesTotal: token.txCountTotal,
    uniqueTraders: uniqueTraders.length,
    holders: token.holderCount,
    creatorEarnings: creatorEarningsWei.toString(),
    poolShareValue: token.poolStats?.accumulatedPoolValue ?? "0",
    liquidityEstimate: token.poolStrength,
    poolStrength: token.poolStrength,
    lastActivity: token.lastActivity?.toISOString() ?? null,
  };
}

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

export async function getCreatorEarningsTotal(creatorAddress: string): Promise<string> {
  const earnings = await prisma.creatorEarning.findMany({
    where: { creatorAddress: creatorAddress.toLowerCase() },
    select: { amount: true },
  });
  let total = 0n;
  for (const e of earnings) {
    total += BigInt(e.amount);
  }
  return total.toString();
}
