import type { PublicClient } from "viem";
import { parseAbiItem, type Address } from "viem";
import { prisma } from "@iopn/database";

const ZERO = "0x0000000000000000000000000000000000000000";
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

/** Count ERC-20 wallets with a non-zero balance from Transfer logs. */
export async function countTokenHolders(
  client: PublicClient,
  tokenAddress: Address
): Promise<number> {
  const logs = await client.getLogs({
    address: tokenAddress,
    event: TRANSFER_EVENT,
    fromBlock: 0n,
    toBlock: "latest",
  });

  const balances = new Map<string, bigint>();

  for (const log of logs) {
    const from = log.args.from?.toLowerCase();
    const to = log.args.to?.toLowerCase();
    const value = log.args.value ?? 0n;

    if (from && from !== ZERO) {
      balances.set(from, (balances.get(from) ?? 0n) - value);
    }
    if (to && to !== ZERO) {
      balances.set(to, (balances.get(to) ?? 0n) + value);
    }
  }

  let holders = 0;
  for (const balance of balances.values()) {
    if (balance > 0n) holders++;
  }
  return holders;
}

export async function refreshTokenHolderCount(
  client: PublicClient,
  tokenId: string,
  tokenAddress: string
): Promise<number> {
  const count = await countTokenHolders(client, tokenAddress as Address);
  await prisma.tokenProject.update({
    where: { id: tokenId },
    data: { holderCount: count },
  });
  return count;
}

export async function refreshAllTokenHolderCounts(
  client: PublicClient,
  chainId: number
): Promise<{ updated: number; failed: number }> {
  const tokens = await prisma.tokenProject.findMany({
    where: { chainId },
    select: { id: true, contractAddress: true },
  });

  let updated = 0;
  let failed = 0;

  for (const token of tokens) {
    try {
      await refreshTokenHolderCount(client, token.id, token.contractAddress);
      updated++;
    } catch {
      failed++;
    }
  }

  return { updated, failed };
}
