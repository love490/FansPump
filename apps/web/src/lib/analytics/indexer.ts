import type { PublicClient } from "viem";
import { parseAbiItem, type Address } from "viem";
import { prisma } from "@iopn/database";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { recordTradingFee } from "@/lib/analytics/record-fee";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";

const FEE_COLLECTED_EVENT = parseAbiItem(
  "event FeeCollected(address indexed token, address indexed creator, uint256 fee)"
);
const SWAP_EXECUTED_EVENT = parseAbiItem(
  "event SwapExecuted(address indexed token, address indexed trader, uint256 amountIn, uint256 amountOut)"
);

export type IndexerSyncResult = {
  fromBlock: string;
  toBlock: string;
  feeEvents: number;
  swapEvents: number;
  skipped: number;
};

export async function syncAnalyticsFromChain(
  client: PublicClient,
  fromBlock?: bigint
): Promise<IndexerSyncResult> {
  const latest = await client.getBlockNumber();
  const start =
    fromBlock ??
    BigInt(process.env.ANALYTICS_INDEX_FROM_BLOCK ?? Math.max(0, Number(latest) - 5_000));

  let feeEvents = 0;
  let swapEvents = 0;
  let skipped = 0;

  const [feeLogs, swapLogs] = await Promise.all([
    client.getLogs({ event: FEE_COLLECTED_EVENT, fromBlock: start, toBlock: latest }),
    client.getLogs({ event: SWAP_EXECUTED_EVENT, fromBlock: start, toBlock: latest }),
  ]);

  for (const log of feeLogs) {
    try {
      const tokenAddress = log.args.token as Address;
      let creatorAddress = log.args.creator as Address;

      if (creatorAddress === "0x0000000000000000000000000000000000000000") {
        creatorAddress = (await readFactoryCreator(client, tokenAddress)) ?? creatorAddress;
      }

      const block = await client.getBlock({ blockHash: log.blockHash });
      const ok = await recordTradingFee({
        tokenAddress,
        creatorAddress,
        feeWei: log.args.fee as bigint,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
        blockTime: new Date(Number(block.timestamp) * 1000),
      });
      if (ok.recorded) feeEvents++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  for (const log of swapLogs) {
    try {
      const tokenAddress = (log.args.token as Address).toLowerCase();
      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: tokenAddress },
      });
      if (!token) {
        skipped++;
        continue;
      }

      const existing = await prisma.swapActivity.findUnique({
        where: {
          txHash_logIndex: {
            txHash: log.transactionHash,
            logIndex: log.logIndex,
          },
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const block = await client.getBlock({ blockHash: log.blockHash });
      const volumeWei = log.args.amountIn as bigint;

      await prisma.$transaction(async (tx) => {
        await tx.swapActivity.create({
          data: {
            tokenId: token.id,
            tokenAddress,
            traderAddress: (log.args.trader as Address).toLowerCase(),
            volumeWei: volumeWei.toString(),
            txHash: log.transactionHash,
            logIndex: log.logIndex,
            blockNumber: log.blockNumber,
            blockTime: new Date(Number(block.timestamp) * 1000),
          },
        });

        const volumeOpn = weiToOpnFloat(volumeWei);
        await tx.tokenProject.update({
          where: { id: token.id },
          data: {
            volumeTotal: { increment: volumeOpn },
            volume24h: { increment: volumeOpn },
            txCountTotal: { increment: 1 },
            txCount24h: { increment: 1 },
            lastActivity: new Date(Number(block.timestamp) * 1000),
            trendingScore: Date.now(),
          },
        });
      });

      swapEvents++;
    } catch {
      skipped++;
    }
  }

  return {
    fromBlock: start.toString(),
    toBlock: latest.toString(),
    feeEvents,
    swapEvents,
    skipped,
  };
}

async function readFactoryCreator(client: PublicClient, token: Address): Promise<Address | null> {
  const factory = opnChainConfig.contracts.factory;
  if (!factory || factory === "0x0000000000000000000000000000000000000000") return null;

  try {
    const creator = await client.readContract({
      address: factory,
      abi: [
        {
          name: "tokenCreator",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "token", type: "address" }],
          outputs: [{ type: "address" }],
        },
      ],
      functionName: "tokenCreator",
      args: [token],
    });
    return creator as Address;
  } catch {
    return null;
  }
}

/** Roll 24h counters — call from cron/sync before indexing. */
export async function refreshRolling24hMetrics(chainId: number) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const tokens = await prisma.tokenProject.findMany({
    where: { chainId },
    select: { id: true },
  });

  for (const { id } of tokens) {
    const [tradeCount, uniqueTraders, activities] = await Promise.all([
      prisma.swapActivity.count({
        where: { tokenId: id, blockTime: { gte: since } },
      }),
      prisma.swapActivity.findMany({
        where: { tokenId: id, blockTime: { gte: since } },
        distinct: ["traderAddress"],
        select: { traderAddress: true },
      }),
      prisma.swapActivity.findMany({
        where: { tokenId: id, blockTime: { gte: since } },
        select: { volumeWei: true },
      }),
    ]);

    let volume24h = 0;
    for (const a of activities) {
      volume24h += weiToOpnFloat(BigInt(a.volumeWei));
    }

    await prisma.tokenProject.update({
      where: { id },
      data: {
        volume24h,
        txCount24h: tradeCount,
        poolStrength: Math.min(100, uniqueTraders.length * 5 + volume24h * 0.1),
      },
    });
  }
}
