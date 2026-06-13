import { prisma } from "@iopn/database";

export type StakingPlatformStats = {
  totalOpnStaked: string;
  totalLpStaked: string;
  activeStakers: number;
  activePositions: number;
};

export async function getStakingPlatformStats(): Promise<StakingPlatformStats> {
  const active = await prisma.stakingPosition.findMany({
    where: { isActive: true },
    select: { wallet: true, assetType: true, amount: true },
  });

  let totalOpnWei = 0n;
  let totalLpWei = 0n;
  const wallets = new Set<string>();

  for (const row of active) {
    wallets.add(row.wallet.toLowerCase());
    const amount = BigInt(row.amount || "0");
    if (row.assetType === "OPN") {
      totalOpnWei += amount;
    } else {
      totalLpWei += amount;
    }
  }

  return {
    totalOpnStaked: totalOpnWei.toString(),
    totalLpStaked: totalLpWei.toString(),
    activeStakers: wallets.size,
    activePositions: active.length,
  };
}
