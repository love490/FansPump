import { prisma } from "@iopn/database";
import { stakingPositionGroupKey } from "@/lib/staking/position-key";

/** Merge duplicate active stake rows for the same wallet + asset group. */
export async function consolidateStakingPositions(wallet: string): Promise<void> {
  const positions = await prisma.stakingPosition.findMany({
    where: { wallet: { equals: wallet, mode: "insensitive" }, isActive: true },
    orderBy: { stakedAt: "asc" },
  });

  const groups = new Map<string, typeof positions>();
  for (const position of positions) {
    const key = stakingPositionGroupKey(position);
    const bucket = groups.get(key) ?? [];
    bucket.push(position);
    groups.set(key, bucket);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const [primary, ...duplicates] = group;
    let mergedAmount = 0n;
    for (const row of group) {
      try {
        mergedAmount += BigInt(row.amount || "0");
      } catch {
        /* skip */
      }
    }

    await prisma.stakingPosition.update({
      where: { id: primary.id },
      data: { amount: mergedAmount.toString() },
    });

    await prisma.stakingPosition.updateMany({
      where: { id: { in: duplicates.map((d) => d.id) } },
      data: { isActive: false, unstakedAt: new Date(), amount: "0" },
    });
  }
}
