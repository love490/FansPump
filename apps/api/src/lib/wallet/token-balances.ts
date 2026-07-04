import { formatUnits, isAddress, type Address } from "viem";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { getPublicClient } from "@/lib/rpc-client";
import { erc20Abi } from "@/lib/swap/abis";
import prisma from "../prisma";
import * as explorer from "../trustscan/blockscout";

export type WalletTokenRow = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  balance: string;
  decimals: number;
  isCreator: boolean;
};

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const MAX_EXPLORER_PAGES = 8;
const LOG_LOOKBACK = Number(process.env.WALLET_TOKEN_LOG_LOOKBACK ?? 250_000);

type ExplorerTokenItem = {
  value?: string;
  token?: {
    address_hash?: string;
    name?: string;
    symbol?: string;
    decimals?: string | number;
    icon_url?: string | null;
  };
};

async function fetchExplorerWalletTokens(wallet: string): Promise<WalletTokenRow[]> {
  const rows: WalletTokenRow[] = [];
  let pageParams: Record<string, string> | null = null;

  for (let page = 0; page < MAX_EXPLORER_PAGES; page++) {
    const query = new URLSearchParams({ type: "ERC-20" });
    if (pageParams) {
      for (const [key, value] of Object.entries(pageParams)) {
        if (value != null && value !== "") query.set(key, String(value));
      }
    }

    const data = await explorer.getAddressTokens(wallet, query.toString());
    if (!data) break;

    const items = (data.items as ExplorerTokenItem[] | undefined) ?? [];
    for (const item of items) {
      const addr = item.token?.address_hash?.toLowerCase();
      if (!addr || !isAddress(addr)) continue;

      const rawValue = item.value ?? "0";
      let balance = 0n;
      try {
        balance = BigInt(rawValue);
      } catch {
        balance = 0n;
      }
      if (balance <= 0n) continue;

      const decimals = Number(item.token?.decimals ?? 18);
      rows.push({
        contractAddress: addr,
        name: item.token?.name?.trim() || item.token?.symbol?.trim() || "Token",
        symbol: item.token?.symbol?.trim() || "TKN",
        logoUrl: item.token?.icon_url ?? null,
        balance: rawValue,
        decimals: Number.isFinite(decimals) ? decimals : 18,
        isCreator: false,
      });
    }

    const next = data.next_page_params as Record<string, string> | null | undefined;
    if (!next || Object.keys(next).length === 0) break;
    pageParams = next;
  }

  return rows;
}

async function discoverTokenContractsFromLogs(wallet: Address): Promise<Address[]> {
  const client = getPublicClient();
  const latest = await client.getBlockNumber();
  const fromBlock = latest > BigInt(LOG_LOOKBACK) ? latest - BigInt(LOG_LOOKBACK) : 0n;
  const walletTopic = wallet.toLowerCase() as Address;

  const [received, sent] = await Promise.all([
    client
      .getLogs({
        fromBlock,
        toBlock: latest,
        topics: [TRANSFER_TOPIC, null, walletTopic],
      })
      .catch(() => []),
    client
      .getLogs({
        fromBlock,
        toBlock: latest,
        topics: [TRANSFER_TOPIC, walletTopic],
      })
      .catch(() => []),
  ]);

  const seen = new Set<string>();
  for (const log of [...received, ...sent]) {
    const addr = log.address.toLowerCase();
    if (addr && isAddress(addr)) seen.add(addr);
  }
  return [...seen].map((a) => a as Address);
}

async function readBalancesFromChain(
  wallet: Address,
  addresses: Address[]
): Promise<WalletTokenRow[]> {
  if (addresses.length === 0) return [];

  const client = getPublicClient();
  const reads = addresses.flatMap((addr) => [
    {
      address: addr,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [wallet] as const,
    },
    {
      address: addr,
      abi: erc20Abi,
      functionName: "decimals" as const,
    },
    {
      address: addr,
      abi: erc20Abi,
      functionName: "symbol" as const,
    },
    {
      address: addr,
      abi: erc20Abi,
      functionName: "name" as const,
    },
  ]);

  const results = await client.multicall({ contracts: reads, allowFailure: true });
  const rows: WalletTokenRow[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const base = i * 4;
    const balanceResult = results[base];
    const decimalsResult = results[base + 1];
    const symbolResult = results[base + 2];
    const nameResult = results[base + 3];

    const balance =
      balanceResult.status === "success" && typeof balanceResult.result === "bigint"
        ? balanceResult.result
        : 0n;
    if (balance <= 0n) continue;

    const decimals =
      decimalsResult.status === "success" && typeof decimalsResult.result === "number"
        ? Number(decimalsResult.result)
        : 18;
    const symbol =
      symbolResult.status === "success" && typeof symbolResult.result === "string"
        ? symbolResult.result
        : "TKN";
    const name =
      nameResult.status === "success" && typeof nameResult.result === "string"
        ? nameResult.result
        : symbol;

    rows.push({
      contractAddress: addresses[i].toLowerCase(),
      name,
      symbol,
      balance: balance.toString(),
      decimals,
      isCreator: false,
    });
  }

  return rows;
}

async function enrichWalletTokens(wallet: string, rows: WalletTokenRow[]): Promise<WalletTokenRow[]> {
  if (rows.length === 0) return rows;

  const addresses = rows.map((r) => r.contractAddress);
  const chainId = getActiveChainId();

  const dbTokens = await prisma.tokenProject.findMany({
    where: { chainId, contractAddress: { in: addresses } },
    select: {
      contractAddress: true,
      name: true,
      symbol: true,
      logoUrl: true,
      creatorAddress: true,
    },
  });

  const dbByAddr = new Map(dbTokens.map((t) => [t.contractAddress.toLowerCase(), t]));
  const walletLower = wallet.toLowerCase();

  return rows.map((row) => {
    const db = dbByAddr.get(row.contractAddress);
    if (!db) return row;
    return {
      ...row,
      name: db.name || row.name,
      symbol: db.symbol || row.symbol,
      logoUrl: db.logoUrl ?? row.logoUrl,
      isCreator: db.creatorAddress.toLowerCase() === walletLower,
    };
  });
}

/** All ERC-20 balances held by a wallet on OPN Chain (FansPump + external). */
export async function fetchWalletTokenBalances(wallet: string): Promise<WalletTokenRow[]> {
  if (!isAddress(wallet)) return [];

  const normalized = wallet.toLowerCase() as Address;
  let rows = await fetchExplorerWalletTokens(normalized);

  if (rows.length === 0) {
    const contracts = await discoverTokenContractsFromLogs(normalized);
    rows = await readBalancesFromChain(normalized, contracts);
  }

  rows = await enrichWalletTokens(normalized, rows);

  rows.sort((a, b) => {
    const balA = BigInt(a.balance);
    const balB = BigInt(b.balance);
    if (balA !== balB) return balB > balA ? 1 : -1;
    return a.symbol.localeCompare(b.symbol);
  });

  return rows;
}

/** Human-readable balance for debugging/logging. */
export function formatWalletTokenBalance(row: WalletTokenRow): string {
  try {
    return formatUnits(BigInt(row.balance), row.decimals);
  } catch {
    return "0";
  }
}
