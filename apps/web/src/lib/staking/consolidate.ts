import { prisma } from "@iopn/database";
import { stakingPositionGroupKey } from "@/lib/staking/position-key";

/** Merge duplicate active rows for the same asset into a single position. */
export async function consolidateStakingPositions(wallet: string): Promise<void> {
  const positions = await prisma.stakingPosition.findMany({
    where: { wallet, isActive: true },
    orderBy: { stakedAt: "asc" },
  });

  const groups = new Map<string, typeof positions>();

  for (const position of positions) {
    const key = stakingPositionGroupKey(position);
    const list = groups.get(key) ?? [];
    list.push(position);
    groups.set(key, list);
  }

  for (const list of groups.values()) {
    if (list.length <= 1) continue;

    const [primary, ...duplicates] = list;
    const total = list.reduce((sum, row) => sum + BigInt(row.amount), 0n);

    await prisma.stakingPosition.update({
      where: { id: primary.id },
      data: { amount: total.toString() },
    });

    await prisma.stakingPosition.updateMany({
      where: { id: { in: duplicates.map((d) => d.id) } },
      data: { isActive: false, amount: "0", unstakedAt: new Date() },
    });
  }
}
