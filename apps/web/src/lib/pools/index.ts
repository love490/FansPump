import { createPublicClient, http, type Address } from "viem";
import { prisma } from "@iopn/database";
import type { PoolPairType, PoolRecord } from "@iopn/shared";
import { uniswapV2PairAbi } from "@/lib/liquidity/abis";
import { erc20Abi } from "@/lib/swap/abis";
import { opnChainConfig, getActiveChainId, DEX_ROUTER_ADDRESS } from "@/lib/chain-config/opn";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { findPairAddress, quoteCandidatesForPairId } from "@/lib/liquidity/pair-resolve";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import type { LiquidityPairId } from "@/lib/liquidity/pair-tokens";

function getPublicClient() {
  return createPublicClient({
    chain: {
      id: opnChainConfig.id,
      name: opnChainConfig.name,
      nativeCurrency: opnChainConfig.nativeCurrency,
      rpcUrls: { default: { http: [opnChainConfig.rpcUrl] } },
    },
    transport: http(opnChainConfig.rpcUrl),
  });
}

function inferPairType(token0: string, token1: string, usdt: string): PoolPairType {
  const a = token0.toLowerCase();
  const b = token1.toLowerCase();
  const wopn = opnChainConfig.contracts.wopnExplicit.toLowerCase();
  const usdtLower = usdt.toLowerCase();

  const hasWopn = a === wopn || b === wopn;
  const hasUsdt = a === usdtLower || b === usdtLower;

  if (hasWopn && hasUsdt) return "OPN_USDT";
  if (hasWopn) return "OPN_TOKEN";
  return "OTHER";
}

async function readTokenSymbol(client: ReturnType<typeof getPublicClient>, token: Address): Promise<string | null> {
  try {
    const symbol = await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "symbol",
    });
    return typeof symbol === "string" ? symbol : null;
  } catch {
    return null;
  }
}

export function serializePool(row: {
  poolAddress: string;
  token0: string;
  token1: string;
  token0Symbol: string | null;
  token1Symbol: string | null;
  pairType: string;
  totalLiquidity: string;
  totalVolume: string;
  providerCount: number;
  createdAt: Date;
  updatedAt: Date;
  indexedAt: Date | null;
}): PoolRecord {
  return {
    poolAddress: row.poolAddress,
    token0: row.token0,
    token1: row.token1,
    token0Symbol: row.token0Symbol,
    token1Symbol: row.token1Symbol,
    pairType: row.pairType as PoolPairType,
    totalLiquidity: row.totalLiquidity,
    totalVolume: row.totalVolume,
    providerCount: row.providerCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    indexedAt: row.indexedAt?.toISOString() ?? null,
  };
}

export async function syncPoolFromChain(poolAddress: string): Promise<PoolRecord | null> {
  const normalized = poolAddress.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) return null;

  const client = getPublicClient();
  const addr = normalized as Address;

  const [token0, token1, reserves, totalSupply] = await Promise.all([
    client.readContract({ address: addr, abi: uniswapV2PairAbi, functionName: "token0" }),
    client.readContract({ address: addr, abi: uniswapV2PairAbi, functionName: "token1" }),
    client.readContract({ address: addr, abi: uniswapV2PairAbi, functionName: "getReserves" }),
    client.readContract({ address: addr, abi: uniswapV2PairAbi, functionName: "totalSupply" }),
  ]);

  const [token0Symbol, token1Symbol] = await Promise.all([
    readTokenSymbol(client, token0 as Address),
    readTokenSymbol(client, token1 as Address),
  ]);

  const pairType = inferPairType(
    (token0 as string).toLowerCase(),
    (token1 as string).toLowerCase(),
    opnChainConfig.contracts.usdt
  );

  const totalLiquidity = (BigInt(reserves[0]) + BigInt(reserves[1])).toString();

  const row = await prisma.liquidityPool.upsert({
    where: { poolAddress: normalized },
    create: {
      poolAddress: normalized,
      token0: (token0 as string).toLowerCase(),
      token1: (token1 as string).toLowerCase(),
      token0Symbol,
      token1Symbol,
      pairType,
      totalLiquidity,
      totalVolume: "0",
      providerCount: Number(totalSupply) > 0 ? 1 : 0,
      indexedAt: new Date(),
    },
    update: {
      token0: (token0 as string).toLowerCase(),
      token1: (token1 as string).toLowerCase(),
      token0Symbol,
      token1Symbol,
      pairType,
      totalLiquidity,
      indexedAt: new Date(),
    },
  });

  return serializePool(row);
}

export async function listLiquidityPools(limit = 50): Promise<PoolRecord[]> {
  const rows = await prisma.liquidityPool.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(serializePool);
}

export async function getLiquidityPoolAnalytics() {
  const pools = await prisma.liquidityPool.findMany();
  const totalLiquidity = pools.reduce((sum, p) => sum + BigInt(p.totalLiquidity || "0"), 0n);
  const totalVolume = pools.reduce((sum, p) => sum + BigInt(p.totalVolume || "0"), 0n);
  const totalProviders = pools.reduce((sum, p) => sum + p.providerCount, 0);

  return {
    totalPools: pools.length,
    totalLiquidity: totalLiquidity.toString(),
    totalVolume: totalVolume.toString(),
    totalProviders,
    trackingOnly: true,
  };
}

const PAIR_IDS: LiquidityPairId[] = ["OPN", "WOPN", "USDT"];

async function pairHasLiquidity(client: ReturnType<typeof getPublicClient>, pair: Address): Promise<boolean> {
  try {
    const reserves = await client.readContract({
      address: pair,
      abi: uniswapV2PairAbi,
      functionName: "getReserves",
    });
    return BigInt(reserves[0]) > 0n || BigInt(reserves[1]) > 0n;
  } catch {
    return false;
  }
}

/** Scan platform tokens and base OPN pairs on-chain, then index pools with liquidity. */
export async function discoverPlatformPools(tokenLimit = 80): Promise<PoolRecord[]> {
  const chainId = getActiveChainId();
  const client = getPublicClient();
  const [factory, weth] = await Promise.all([
    resolveDexFactory(client),
    readRouterWeth(client, DEX_ROUTER_ADDRESS),
  ]);
  const wopn = opnChainConfig.contracts.wopnExplicit;
  const usdt = opnChainConfig.contracts.usdt;

  const poolAddresses = new Set<string>();

  const basePair = await findPairAddress(client, factory, weth, [usdt]);
  if (basePair) poolAddresses.add(basePair.toLowerCase());

  const tokens = await prisma.tokenProject.findMany({
    where: { chainId, isHidden: false },
    select: { contractAddress: true },
    orderBy: { createdAt: "desc" },
    take: tokenLimit,
  });

  await Promise.all(
    tokens.map(async ({ contractAddress }) => {
      const token = contractAddress.toLowerCase() as Address;
      for (const pairId of PAIR_IDS) {
        const quotes = quoteCandidatesForPairId(pairId, weth, wopn, usdt);
        const pair = await findPairAddress(client, factory, token, quotes);
        if (pair) poolAddresses.add(pair.toLowerCase());
      }
    })
  );

  const synced: PoolRecord[] = [];
  for (const poolAddress of poolAddresses) {
    try {
      const hasLiq = await pairHasLiquidity(client, poolAddress as Address);
      if (!hasLiq) continue;
      const pool = await syncPoolFromChain(poolAddress);
      if (pool) synced.push(pool);
    } catch (e) {
      console.warn("[pools] discover sync failed for", poolAddress, e);
    }
  }

  return synced;
}
