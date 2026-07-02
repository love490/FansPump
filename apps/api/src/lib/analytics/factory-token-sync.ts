import { decodeEventLog, parseAbiItem, type Address } from "viem";
import { getActiveChainId, opnChainConfig } from "@/lib/chain-config/opn";
import { getPublicClient } from "@/lib/rpc-client";
import prisma from "../prisma";
import { initializeTokenAnalytics } from "./token-init";

const ZERO = "0x0000000000000000000000000000000000000000";

const TOKEN_CREATED_EVENT = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed creator, string name, string symbol, uint256 featureFlags, uint256 initialSupply)"
);

let lastSyncAt = 0;
let syncInFlight: Promise<{ indexed: number }> | null = null;

const SYNC_COOLDOWN_MS = 45_000;

/** Index factory TokenCreated events into tokenProject (idempotent, rate-limited). */
export async function ensureFactoryTokensSynced(force = false): Promise<{ indexed: number }> {
  if (!force && Date.now() - lastSyncAt < SYNC_COOLDOWN_MS) {
    return { indexed: 0 };
  }
  if (syncInFlight) return syncInFlight;

  syncInFlight = syncFactoryTokensFromChain()
    .catch((e) => {
      console.error("[factory-token-sync]", e);
      return { indexed: 0 };
    })
    .finally(() => {
      syncInFlight = null;
      lastSyncAt = Date.now();
    });

  return syncInFlight;
}

async function syncFactoryTokensFromChain(): Promise<{ indexed: number }> {
  const factory = opnChainConfig.contracts.factory;
  if (!factory || factory.toLowerCase() === ZERO) {
    return { indexed: 0 };
  }

  const client = getPublicClient();
  const latest = await client.getBlockNumber();
  // Default: larger lookback so missed deployments still get indexed.
  // Can be overridden via FACTORY_INDEX_BLOCK_LOOKBACK / FACTORY_INDEX_FROM_BLOCK.
  const lookback = Number(process.env.FACTORY_INDEX_BLOCK_LOOKBACK ?? 1_000_000);
  const envFrom = process.env.FACTORY_INDEX_FROM_BLOCK?.trim();
  const start = envFrom
    ? BigInt(envFrom)
    : BigInt(Math.max(0, Number(latest) - lookback));

  const logs = await client.getLogs({
    address: factory as Address,
    event: TOKEN_CREATED_EVENT,
    fromBlock: start,
    toBlock: latest,
  });

  let indexed = 0;
  const chainId = getActiveChainId();

  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: [TOKEN_CREATED_EVENT],
        data: log.data,
        topics: log.topics,
      });

      const tokenAddress = String(decoded.args.token).toLowerCase();
      const creator = String(decoded.args.creator).toLowerCase();
      const name = String(decoded.args.name ?? "").trim();
      const symbol = String(decoded.args.symbol ?? "").trim();
      const featureFlags = decoded.args.featureFlags as bigint;
      const initialSupply = (decoded.args.initialSupply as bigint).toString();

      const existing = await prisma.tokenProject.findUnique({
        where: { contractAddress: tokenAddress },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.user.upsert({
        where: { walletAddress: creator },
        create: { walletAddress: creator },
        update: {},
      });

      const block = await client.getBlock({ blockHash: log.blockHash }).catch(() => null);
      const createdAt = block ? new Date(Number(block.timestamp) * 1000) : undefined;

      const token = await prisma.tokenProject.create({
        data: {
          contractAddress: tokenAddress,
          chainId,
          name: name || symbol || "Token",
          symbol: symbol || "TKN",
          initialSupply,
          featureFlags,
          creatorAddress: creator,
          factoryAddress: factory.toLowerCase(),
          txHash: log.transactionHash,
          trendingScore: block ? Number(block.timestamp) * 1000 : Date.now(),
          ...(createdAt ? { createdAt } : {}),
        },
      });

      await initializeTokenAnalytics({
        tokenId: token.id,
        tokenAddress: token.contractAddress,
      });

      indexed++;
    } catch (e) {
      console.warn("[factory-token-sync] skip log:", e);
    }
  }

  return { indexed };
}
