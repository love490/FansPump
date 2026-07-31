import { prisma, type Prisma } from "@iopn/database";
import { TOKEN_CATEGORIES } from "@iopn/shared";
import type {
  AnalyticsLaunchSort,
  AnalyticsRange,
  AnalyticsTokenRow,
  ChartPoint,
  MarketSentiment,
  PlatformAnalyticsPayload,
} from "@iopn/shared";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";
import { mapTokenListRow, tokenListSelect } from "@/lib/analytics/token-list";
import { getLiquidityPoolAnalytics } from "@/lib/pools/index";

const TRUSTED_THRESHOLD = 75;
const ACTIVE_DAYS = 30;

type TokenRow = Prisma.TokenProjectGetPayload<{ select: typeof tokenListSelect }> & {
  poolStrength: number;
  poolStats?: { poolReserveEstimate: string } | null;
  _count?: { watchlist: number };
};

function rangeStart(range: AnalyticsRange): Date | null {
  const now = Date.now();
  switch (range) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function estimatePrice(token: {
  volume24h: number | null;
  volumeTotal: number | null;
  txCount24h: number | null;
  poolStrength: number;
  holderCount: number;
}): number {
  if (token.poolStrength > 0) return Math.max(token.poolStrength / 1_000_000, 0.000001);
  if (token.volume24h && token.txCount24h) {
    return Math.max(token.volume24h / Math.max(token.txCount24h, 1), 0.00001);
  }
  if (token.volumeTotal && token.holderCount > 0) {
    return Math.max(token.volumeTotal / Math.max(token.holderCount * 10, 1), 0.00001);
  }
  return 0.0001;
}

function estimateMarketCap(token: {
  poolStrength: number;
  holderCount: number;
  volumeTotal: number | null;
  price: number;
}): number {
  if (token.poolStrength > 0) return token.poolStrength;
  if (token.volumeTotal && token.volumeTotal > 0) return token.volumeTotal * 12;
  return token.price * Math.max(token.holderCount, 1) * 1000;
}

function estimateChange24h(token: { volume24h: number | null; volumeTotal: number | null }): number {
  if (token.volume24h != null && token.volumeTotal != null && token.volumeTotal > 0) {
    const ratio = token.volume24h / token.volumeTotal;
    return Math.round(Math.max(-35, Math.min(35, (ratio - 0.15) * 40)) * 100) / 100;
  }
  return 0;
}

function tokenStatus(row: TokenRow): AnalyticsTokenRow["status"] {
  if (row.verificationStatus === "APPROVED") return "verified";
  const ageMs = Date.now() - row.createdAt.getTime();
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "new";
  if (row.trendingScore > 50 || row.viewCount > 100) return "trending";
  return "active";
}

function mapAnalyticsToken(
  row: TokenRow,
  rank: number,
  favoriteCount = 0
): AnalyticsTokenRow {
  const base = mapTokenListRow(row);
  const price = estimatePrice({
    volume24h: base.volume24h,
    volumeTotal: base.volumeTotal,
    txCount24h: base.txCount24h,
    poolStrength: row.poolStrength,
    holderCount: base.holderCount,
  });
  return {
    rank,
    id: base.id,
    contractAddress: base.contractAddress,
    name: base.name,
    symbol: base.symbol,
    logoUrl: base.logoUrl,
    creatorAddress: base.creatorAddress,
    creatorUsername: base.creatorUsername,
    category: base.category,
    trustScore: base.trustScore,
    holderCount: base.holderCount,
    viewCount: base.viewCount,
    volume24h: base.volume24h ?? 0,
    volumeTotal: base.volumeTotal ?? 0,
    poolStrength: row.poolStrength,
    priceEstimate: price,
    marketCapEstimate: estimateMarketCap({
      poolStrength: row.poolStrength,
      holderCount: base.holderCount,
      volumeTotal: base.volumeTotal,
      price,
    }),
    change24h: estimateChange24h({
      volume24h: base.volume24h,
      volumeTotal: base.volumeTotal,
    }),
    liquidityLocked: base.liquidityLocked,
    verificationStatus: base.verificationStatus,
    createdAt: base.createdAt.toISOString(),
    updatedAt: base.updatedAt.toISOString(),
    status: tokenStatus(row),
    favoriteCount,
  };
}

function launchOrderBy(sort: AnalyticsLaunchSort): Prisma.TokenProjectOrderByWithRelationInput[] {
  switch (sort) {
    case "views":
      return [{ viewCount: "desc" }, { createdAt: "desc" }];
    case "liquidity":
      return [{ poolStrength: "desc" }, { createdAt: "desc" }];
    case "trust":
      return [{ trustScore: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

function rankingOrderBy(
  category: string
): Prisma.TokenProjectOrderByWithRelationInput[] {
  switch (category) {
    case "views":
      return [{ viewCount: "desc" }];
    case "traded":
      return [{ txCount24h: "desc" }, { volume24h: "desc" }];
    case "liquidity":
      return [{ poolStrength: "desc" }];
    case "marketCap":
      return [{ poolStrength: "desc" }, { volumeTotal: "desc" }];
    case "growing":
      return [{ trendingScore: "desc" }, { holderCount: "desc" }];
    case "holders":
      return [{ holderCount: "desc" }];
    case "trust":
      return [{ trustScore: "desc" }];
    case "updated":
      return [{ updatedAt: "desc" }];
    case "favorited":
      return [{ viewCount: "desc" }];
    default:
      return [{ trendingScore: "desc" }, { viewCount: "desc" }];
  }
}

function buildSentiment(volume24h: number, volume7d: number, avgTrust: number): MarketSentiment {
  const dailyAvg = volume7d > 0 ? volume7d / 7 : 0;
  const volumeRatio = dailyAvg > 0 ? volume24h / dailyAvg : 1;
  if (volumeRatio >= 1.15 && avgTrust >= 55) return "bullish";
  if (volumeRatio <= 0.75 || avgTrust < 40) return "bearish";
  return "neutral";
}

async function aggregateChartPoints(
  chainId: number,
  range: AnalyticsRange
): Promise<PlatformAnalyticsPayload["charts"]> {
  const start = rangeStart(range);
  const since = start ?? new Date(0);

  const [snapshots, swapByDay, tokensByDay, hourlySwaps, trustBuckets, categoryGroups, creatorGroups] =
    await Promise.all([
      prisma.tokenDailySnapshot.findMany({
        where: { snapshotDate: { gte: since }, token: { chainId } },
        select: {
          snapshotDate: true,
          holderCount: true,
          liquidityScore: true,
          volume24h: true,
          trustScore: true,
        },
        orderBy: { snapshotDate: "asc" },
      }),
      prisma.$queryRaw<{ day: Date; volume: number; trades: bigint }[]>`
        SELECT date_trunc('day', block_time) AS day,
               COALESCE(SUM(CAST(volume_wei AS numeric)), 0) AS volume,
               COUNT(*) AS trades
        FROM swap_activities sa
        INNER JOIN token_projects tp ON tp.id = sa.token_id
        WHERE tp.chain_id = ${chainId}
          AND sa.block_time >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `.catch(() => []),
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count
        FROM token_projects
        WHERE chain_id = ${chainId} AND created_at >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `.catch(() => []),
      prisma.$queryRaw<{ hour: Date; volume: number }[]>`
        SELECT date_trunc('hour', block_time) AS hour,
               COALESCE(SUM(CAST(volume_wei AS numeric)), 0) AS volume
        FROM swap_activities sa
        INNER JOIN token_projects tp ON tp.id = sa.token_id
        WHERE tp.chain_id = ${chainId}
          AND sa.block_time >= ${new Date(Date.now() - 24 * 60 * 60 * 1000)}
        GROUP BY 1
        ORDER BY 1 ASC
      `.catch(() => []),
      prisma.tokenProject.groupBy({
        by: ["trustScore"],
        where: { chainId },
        _count: true,
      }),
      prisma.tokenProject.groupBy({
        by: ["category"],
        where: { chainId },
        _count: true,
      }),
      prisma.tokenProject.groupBy({
        by: ["creatorAddress"],
        where: { chainId, createdAt: { gte: since } },
        _count: true,
      }),
    ]);

  const byDate = new Map<
    string,
    { holders: number; liquidity: number; volume: number; marketCap: number }
  >();

  for (const row of snapshots) {
    const key = row.snapshotDate.toISOString().slice(0, 10);
    const prev = byDate.get(key) ?? { holders: 0, liquidity: 0, volume: 0, marketCap: 0 };
    prev.holders += row.holderCount;
    prev.liquidity += row.liquidityScore;
    prev.volume += row.volume24h;
    prev.marketCap += row.liquidityScore * 1000 + row.volume24h * 50;
    byDate.set(key, prev);
  }

  const holderGrowthTrend: ChartPoint[] = [];
  const liquidityTrend: ChartPoint[] = [];
  const marketCapTrend: ChartPoint[] = [];
  for (const [t, v] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    holderGrowthTrend.push({ t, v: v.holders });
    liquidityTrend.push({ t, v: Math.round(v.liquidity * 100) / 100 });
    marketCapTrend.push({ t, v: Math.round(v.marketCap * 100) / 100 });
  }

  const volumeTrend: ChartPoint[] = swapByDay.map((row) => ({
    t: row.day.toISOString().slice(0, 10),
    v: Math.round(weiToOpnFloat(BigInt(String(row.volume))) * 10000) / 10000,
  }));

  const creationMap = new Map<string, number>();
  for (const row of tokensByDay) {
    const key = row.day.toISOString().slice(0, 10);
    creationMap.set(key, Number(row.count));
  }
  const tokenCreationTrend = [...creationMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([t, v]) => ({ t, v }));

  const trustScoreDistribution = [
    { bucket: "0–25", count: 0 },
    { bucket: "26–50", count: 0 },
    { bucket: "51–75", count: 0 },
    { bucket: "76–100", count: 0 },
  ];
  for (const row of trustBuckets) {
    const score = row.trustScore;
    const count = row._count;
    if (score <= 25) trustScoreDistribution[0].count += count;
    else if (score <= 50) trustScoreDistribution[1].count += count;
    else if (score <= 75) trustScoreDistribution[2].count += count;
    else trustScoreDistribution[3].count += count;
  }

  const categoryBreakdown = TOKEN_CATEGORIES.map((cat) => {
    const row = categoryGroups.find((g) => g.category === cat);
    return { category: cat, count: row?._count ?? 0 };
  }).filter((c) => c.count > 0);

  const creatorByWeek = new Map<string, number>();
  for (const row of creatorGroups) {
    creatorByWeek.set(row.creatorAddress, row._count);
  }
  const creatorActivity: ChartPoint[] = [
    {
      t: new Date().toISOString().slice(0, 10),
      v: creatorByWeek.size,
    },
  ];

  const hourlyVolume: ChartPoint[] = hourlySwaps.map((row) => ({
    t: row.hour.toISOString(),
    v: Math.round(weiToOpnFloat(BigInt(String(row.volume))) * 10000) / 10000,
  }));

  return {
    marketCapTrend,
    volumeTrend,
    liquidityTrend,
    tokenCreationTrend,
    holderGrowthTrend,
    trustScoreDistribution,
    categoryBreakdown,
    creatorActivity,
    hourlyVolume,
  };
}

export type PlatformAnalyticsQuery = {
  range?: AnalyticsRange;
  launchSort?: AnalyticsLaunchSort;
  q?: string;
  category?: string;
  verified?: boolean;
  minTrust?: number;
  creator?: string;
};

export async function getPlatformAnalyticsDashboard(
  query: PlatformAnalyticsQuery = {}
): Promise<PlatformAnalyticsPayload> {
  const chainId = getActiveChainId();
  const range = query.range ?? "7d";
  const launchSort = query.launchSort ?? "newest";
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeSince = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);

  const tokenWhere: Prisma.TokenProjectWhereInput = {
    chainId,
    isHidden: false,
    ...(query.category ? { category: query.category as Prisma.EnumTokenCategoryFilter["equals"] } : {}),
    ...(query.verified ? { verificationStatus: "APPROVED" } : {}),
    ...(query.minTrust ? { trustScore: { gte: query.minTrust } } : {}),
    ...(query.creator ? { creatorAddress: query.creator.toLowerCase() } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { symbol: { contains: query.q, mode: "insensitive" } },
            { contractAddress: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const tokenSelect = {
    ...tokenListSelect,
    poolStrength: true,
    poolStats: { select: { poolReserveEstimate: true } },
    _count: { select: { watchlist: true } },
  } satisfies Prisma.TokenProjectSelect;

  const [
    totalTokens,
    activeTokens,
    verifiedProjects,
    trustedProjects,
    holderAgg,
    txTotal,
    volumeAgg,
    creatorGroups,
    activeQuests,
    poolAnalytics,
    locksAgg,
    locksToday,
    recentLocks,
    expiringLocks,
    swaps24h,
    swaps7d,
    swaps30d,
    largestTrades,
    favoriteGroups,
    newLaunchRows,
    rankingRows,
    snapshot7dAgo,
    snapshot30dAgo,
  ] = await Promise.all([
    prisma.tokenProject.count({ where: { chainId, isHidden: false } }),
    prisma.tokenProject.count({
      where: {
        chainId,
        isHidden: false,
        OR: [
          { volume24h: { gt: 0 } },
          { txCount24h: { gt: 0 } },
          { lastActivity: { gte: activeSince } },
        ],
      },
    }),
    prisma.tokenProject.count({
      where: { chainId, verificationStatus: "APPROVED", isHidden: false },
    }),
    prisma.tokenProject.count({
      where: { chainId, trustScore: { gte: TRUSTED_THRESHOLD }, isHidden: false },
    }),
    prisma.tokenProject.aggregate({
      where: { chainId, isHidden: false },
      _sum: { holderCount: true },
    }),
    prisma.swapActivity.count({ where: { token: { chainId } } }),
    prisma.tokenProject.aggregate({
      where: { chainId, isHidden: false },
      _sum: { volume24h: true, volumeTotal: true },
      _avg: { trustScore: true, holderCount: true, txCount24h: true },
    }),
    prisma.tokenProject.groupBy({
      by: ["creatorAddress"],
      where: { chainId },
    }),
    prisma.bounty.count({ where: { status: "ACTIVE" } }),
    getLiquidityPoolAnalytics(),
    prisma.liquidityLock.findMany({
      where: { token: { chainId }, unlockAt: { gt: new Date() } },
      select: { amount: true },
    }),
    prisma.liquidityLock.findMany({
      where: { token: { chainId }, createdAt: { gte: since24h } },
      select: { amount: true },
    }),
    prisma.liquidityLock.findMany({
      where: { token: { chainId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        amount: true,
        unlockAt: true,
        createdAt: true,
        token: { select: { symbol: true } },
      },
    }),
    prisma.liquidityLock.findMany({
      where: {
        token: { chainId },
        unlockAt: { gte: since24h, lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      },
      take: 8,
      select: {
        amount: true,
        unlockAt: true,
        token: { select: { symbol: true } },
      },
    }),
    prisma.swapActivity.findMany({
      where: { blockTime: { gte: since24h }, token: { chainId } },
      select: { volumeWei: true },
    }),
    prisma.swapActivity.findMany({
      where: { blockTime: { gte: since7d }, token: { chainId } },
      select: { volumeWei: true },
    }),
    prisma.swapActivity.findMany({
      where: { blockTime: { gte: since30d }, token: { chainId } },
      select: { volumeWei: true },
    }),
    prisma.swapActivity.findMany({
      where: { token: { chainId } },
      orderBy: { blockTime: "desc" },
      take: 10,
      select: {
        tokenAddress: true,
        traderAddress: true,
        volumeWei: true,
        txHash: true,
        blockTime: true,
        token: { select: { symbol: true } },
      },
    }),
    prisma.watchlistItem.groupBy({
      by: ["tokenId"],
      _count: true,
      orderBy: { _count: { tokenId: "desc" } },
      take: 20,
    }),
    prisma.tokenProject.findMany({
      where: tokenWhere,
      orderBy: launchOrderBy(launchSort),
      take: 12,
      select: tokenSelect,
    }),
    prisma.tokenProject.findMany({
      where: { chainId, isHidden: false },
      orderBy: rankingOrderBy("trending"),
      take: 10,
      select: tokenSelect,
    }),
    prisma.tokenDailySnapshot.aggregate({
      where: {
        snapshotDate: {
          gte: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          lte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
        token: { chainId },
      },
      _sum: { holderCount: true, volume24h: true },
    }),
    prisma.tokenDailySnapshot.aggregate({
      where: {
        snapshotDate: {
          gte: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
          lte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        },
        token: { chainId },
      },
      _sum: { holderCount: true, volume24h: true },
    }),
  ]);

  const volume24h = volumeAgg._sum.volume24h ?? 0;
  const totalHolders = holderAgg._sum.holderCount ?? 0;
  const totalLiquidityOpn = weiToOpnFloat(BigInt(poolAnalytics.totalLiquidity || "0"));

  const sumVolume = (rows: { volumeWei: string }[]) =>
    rows.reduce((acc, row) => acc + weiToOpnFloat(BigInt(row.volumeWei || "0")), 0);

  const volume7d = sumVolume(swaps7d);
  const volume30d = sumVolume(swaps30d);
  const avgTrust = volumeAgg._avg.trustScore ?? 0;
  const avgHolders = volumeAgg._avg.holderCount ?? 0;
  const avgTx24h = volumeAgg._avg.txCount24h ?? 0;

  const categoryPerf = await prisma.tokenProject.groupBy({
    by: ["category"],
    where: { chainId, volume24h: { gt: 0 } },
    _sum: { volume24h: true },
    orderBy: { _sum: { volume24h: "desc" } },
    take: 1,
  });

  const favoriteMap = new Map(favoriteGroups.map((f) => [f.tokenId, f._count]));

  const mapRows = (rows: TokenRow[]) =>
    rows.map((row, i) =>
      mapAnalyticsToken(row, i + 1, favoriteMap.get(row.id) ?? row._count?.watchlist ?? 0)
    );

  const rankingCategories = [
    "trending",
    "views",
    "traded",
    "liquidity",
    "marketCap",
    "growing",
    "holders",
    "trust",
    "updated",
    "favorited",
  ] as const;

  const rankingResults = await Promise.all(
    rankingCategories.map(async (cat) => {
      const orderBy =
        cat === "favorited"
          ? [{ viewCount: "desc" as const }]
          : rankingOrderBy(cat);
      const rows = await prisma.tokenProject.findMany({
        where: { chainId, isHidden: false },
        orderBy,
        take: 10,
        select: tokenSelect,
      });
      return [cat, mapRows(rows as TokenRow[])] as const;
    })
  );

  const charts = await aggregateChartPoints(chainId, range);

  const lockedSum = locksAgg.reduce((s, l) => s + BigInt(l.amount || "0"), 0n);
  const addedToday = locksToday.reduce((s, l) => s + BigInt(l.amount || "0"), 0n);

  const largestPools = await prisma.liquidityPool.findMany({
    orderBy: { totalLiquidity: "desc" },
    take: 6,
    select: {
      poolAddress: true,
      totalLiquidity: true,
      token0Symbol: true,
      token1Symbol: true,
    },
  });

  const fastestGrowing = await prisma.tokenProject.findMany({
    where: { chainId, isHidden: false },
    orderBy: [{ trendingScore: "desc" }, { holderCount: "desc" }],
    take: 6,
    select: tokenSelect,
  });

  const highestHolders = await prisma.tokenProject.findMany({
    where: { chainId, isHidden: false },
    orderBy: { holderCount: "desc" },
    take: 6,
    select: tokenSelect,
  });

  const prevHolders7d = snapshot7dAgo._sum.holderCount ?? 0;
  const prevVolume7d = snapshot7dAgo._sum.volume24h ?? 0;
  const prevHolders30d = snapshot30dAgo._sum.holderCount ?? 0;
  const prevVolume30d = snapshot30dAgo._sum.volume24h ?? 0;

  const changeKeys = [
    "totalTokensCreated",
    "activeTokens",
    "totalHolders",
    "volume24h",
    "totalTransactions",
    "totalLiquidityOpn",
  ] as const;

  const mkChanges = (prevHolders: number, prevVol: number) =>
    Object.fromEntries(
      changeKeys.map((key) => {
        if (key === "totalHolders") return [key, pctChange(totalHolders, prevHolders)];
        if (key === "volume24h") return [key, pctChange(volume24h, prevVol)];
        return [key, null];
      })
    );

  const totalMarketCap = mapRows(rankingRows as TokenRow[]).reduce(
    (s, t) => s + t.marketCapEstimate,
    0
  );

  return {
    updatedAt: new Date().toISOString(),
    range,
    platformOverview: {
      totalTokensCreated: totalTokens,
      activeTokens,
      verifiedProjects,
      trustedProjects,
      totalHolders,
      totalTransactions: txTotal,
      totalLiquidityOpn,
      volume24h,
      totalCreators: creatorGroups.length,
      activeQuests,
      changes: {
        h24: mkChanges(totalHolders, volume24h * 0.9),
        d7: mkChanges(prevHolders7d, prevVolume7d),
        d30: mkChanges(prevHolders30d, prevVolume30d),
      },
    },
    marketOverview: {
      totalMarketCap,
      volume24h,
      totalLiquidity: totalLiquidityOpn,
      averageTokenPrice:
        totalTokens > 0
          ? mapRows(rankingRows as TokenRow[]).reduce((s, t) => s + t.priceEstimate, 0) /
            Math.max(rankingRows.length, 1)
          : 0,
      averageTrustScore: Math.round(avgTrust * 10) / 10,
      averageHolderCount: Math.round(avgHolders),
      averageDailyTransactions: Math.round(avgTx24h),
      bestPerformingCategory: categoryPerf[0]?.category ?? null,
      sentiment: buildSentiment(volume24h, volume7d, avgTrust),
    },
    newLaunches: mapRows(newLaunchRows as TokenRow[]),
    liquidity: {
      totalLiquidityLocked: weiToOpnFloat(lockedSum),
      totalLiquidityAdded: totalLiquidityOpn,
      liquidityAddedToday: weiToOpnFloat(addedToday),
      liquidityRemovedToday: 0,
      largestPools: largestPools.map((p) => ({
        name: `${p.token0Symbol ?? "?"}/${p.token1Symbol ?? "?"}`,
        symbol: p.token0Symbol ?? "LP",
        liquidity: weiToOpnFloat(BigInt(p.totalLiquidity || "0")),
        poolAddress: p.poolAddress,
      })),
      recentLocks: recentLocks.map((l) => ({
        tokenSymbol: l.token.symbol,
        amount: l.amount,
        unlockAt: l.unlockAt.toISOString(),
        createdAt: l.createdAt.toISOString(),
      })),
      recentUnlocks: expiringLocks.map((l) => ({
        tokenSymbol: l.token.symbol,
        amount: l.amount,
        unlockAt: l.unlockAt.toISOString(),
      })),
    },
    trading: {
      volume24h: sumVolume(swaps24h),
      volume7d,
      volume30d,
      transactionCount24h: swaps24h.length,
      averageTradeSize:
        swaps24h.length > 0 ? sumVolume(swaps24h) / swaps24h.length : 0,
      largestTrades: largestTrades.map((t) => ({
        tokenAddress: t.tokenAddress,
        tokenSymbol: t.token.symbol,
        traderAddress: t.traderAddress,
        volumeOpn: weiToOpnFloat(BigInt(t.volumeWei || "0")),
        blockTime: t.blockTime.toISOString(),
        txHash: t.txHash,
      })),
      mostActiveTokens: mapRows(rankingRows as TokenRow[]).slice(0, 6),
      mostTradedTokens: mapRows(
        (
          await prisma.tokenProject.findMany({
            where: { chainId, isHidden: false },
            orderBy: [{ txCount24h: "desc" }],
            take: 6,
            select: tokenSelect,
          })
        ) as TokenRow[]
      ),
    },
    holders: {
      totalHolders,
      newHoldersToday: Math.max(0, totalHolders - prevHolders7d),
      newHoldersThisWeek: Math.max(0, totalHolders - prevHolders7d),
      fastestGrowing: mapRows(fastestGrowing as TokenRow[]),
      highestRetention: mapRows(highestHolders as TokenRow[]),
      largestIncrease: mapRows(fastestGrowing as TokenRow[]),
    },
    rankings: Object.fromEntries(rankingResults),
    charts,
  };
}
