import prisma from "../prisma";

export function serializePool(pool: {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint | null;
  reserve1: bigint | null;
  totalSupply: bigint | null;
  chainId: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...pool,
    reserve0: pool.reserve0?.toString() ?? null,
    reserve1: pool.reserve1?.toString() ?? null,
    totalSupply: pool.totalSupply?.toString() ?? null,
  };
}

export async function listLiquidityPools(limit = 50) {
  const pools = await prisma.liquidityPool.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return pools.map(serializePool);
}

export async function discoverPlatformPools() {
  const pools = await prisma.liquidityPool.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return pools.map(serializePool);
}

export async function syncPoolFromChain(poolAddress: string) {
  const pool = await prisma.liquidityPool.findUnique({
    where: { poolAddress },
  });
  if (!pool) return null;
  return serializePool(pool);
}

export async function getLiquidityPoolAnalytics() {
  const [totalPools, recentPools] = await Promise.all([
    prisma.liquidityPool.count(),
    prisma.liquidityPool.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    totalPools,
    recentPools,
    last24h: recentPools,
  };
}