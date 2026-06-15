import { prisma } from "@iopn/database";

export async function getLaunchpoolStakeStats(launchpoolId: string) {
  const stakes = await prisma.launchpoolStake.findMany({
    where: { launchpoolId, isActive: true },
    select: { walletAddress: true, amount: true },
  });

  let totalStakedAmount = 0n;
  const wallets = new Set<string>();
  for (const stake of stakes) {
    try {
      totalStakedAmount += BigInt(stake.amount);
    } catch {
      // ignore invalid amounts
    }
    wallets.add(stake.walletAddress);
  }

  return {
    totalStakedAmount: totalStakedAmount.toString(),
    participantCount: wallets.size,
  };
}

export async function distributeLaunchpoolRewards(launchpoolId: string) {
  const pool = await prisma.launchpool.findUnique({
    where: { id: launchpoolId },
    include: { stakes: { where: { isActive: true } } },
  });

  if (!pool) throw new Error("Launchpool not found");
  if (pool.rewardsDistributed) throw new Error("Rewards already distributed");

  const walletTotals = new Map<string, bigint>();
  let totalStaked = 0n;

  for (const stake of pool.stakes) {
    let amount = 0n;
    try {
      amount = BigInt(stake.amount);
    } catch {
      continue;
    }
    if (amount <= 0n) continue;
    totalStaked += amount;
    walletTotals.set(stake.walletAddress, (walletTotals.get(stake.walletAddress) ?? 0n) + amount);
  }

  const totalReward = BigInt(pool.totalRewardAmount || "0");
  if (totalReward <= 0n) throw new Error("Reward pool amount must be greater than zero");

  const rewardRows: {
    launchpoolId: string;
    walletAddress: string;
    amount: string;
    tokenSymbol: string;
    tokenAddress: string | null;
  }[] = [];

  for (const [walletAddress, stakeAmount] of walletTotals) {
    const share = totalStaked > 0n ? (stakeAmount * totalReward) / totalStaked : 0n;
    if (share <= 0n) continue;
    rewardRows.push({
      launchpoolId: pool.id,
      walletAddress,
      amount: share.toString(),
      tokenSymbol: pool.rewardTokenSymbol,
      tokenAddress: pool.rewardTokenAddress,
    });
  }

  await prisma.$transaction([
    ...rewardRows.map((row) => prisma.launchpoolReward.create({ data: row })),
    prisma.launchpool.update({
      where: { id: pool.id },
      data: { rewardsDistributed: true },
    }),
  ]);

  return { distributed: rewardRows.length };
}

export async function getUnclaimedLaunchpoolRewards(wallet: string) {
  const rewards = await prisma.launchpoolReward.findMany({
    where: { walletAddress: wallet, claimedAt: null },
    include: { launchpool: { select: { title: true } } },
    orderBy: { accruedAt: "desc" },
  });

  return rewards;
}

export async function markLaunchpoolRewardsClaimed(wallet: string) {
  const result = await prisma.launchpoolReward.updateMany({
    where: { walletAddress: wallet, claimedAt: null },
    data: { claimedAt: new Date() },
  });
  return result.count;
}
