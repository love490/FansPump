import { prisma } from "@iopn/database";

export type LaunchpoolAssetStakeStats = {
  assetSymbol: string;
  assetAddress: string | null;
  totalStakedAmount: string;
  participantCount: number;
};

export type LaunchpoolStakeStats = {
  totalStakedAmount: string;
  participantCount: number;
  assetStats: LaunchpoolAssetStakeStats[];
};

function assetStatsKey(assetSymbol: string, assetAddress: string | null): string {
  return `${assetSymbol.toUpperCase()}::${(assetAddress ?? "").toLowerCase()}`;
}

export async function getLaunchpoolStakeStats(launchpoolId: string): Promise<LaunchpoolStakeStats> {
  const stakes = await prisma.launchpoolStake.findMany({
    where: { launchpoolId, isActive: true },
    select: { walletAddress: true, amount: true, assetSymbol: true, assetAddress: true },
  });

  let total = 0n;
  const participants = new Set<string>();
  const byAsset = new Map<
    string,
    { assetSymbol: string; assetAddress: string | null; total: bigint; participants: Set<string> }
  >();

  for (const stake of stakes) {
    participants.add(stake.walletAddress.toLowerCase());
    const key = assetStatsKey(stake.assetSymbol, stake.assetAddress);
    if (!byAsset.has(key)) {
      byAsset.set(key, {
        assetSymbol: stake.assetSymbol,
        assetAddress: stake.assetAddress,
        total: 0n,
        participants: new Set(),
      });
    }
    const assetEntry = byAsset.get(key)!;
    assetEntry.participants.add(stake.walletAddress.toLowerCase());
    try {
      const amount = BigInt(stake.amount || "0");
      total += amount;
      assetEntry.total += amount;
    } catch {
      /* skip */
    }
  }

  const assetStats: LaunchpoolAssetStakeStats[] = Array.from(byAsset.values()).map((entry) => ({
    assetSymbol: entry.assetSymbol,
    assetAddress: entry.assetAddress,
    totalStakedAmount: entry.total.toString(),
    participantCount: entry.participants.size,
  }));

  return {
    totalStakedAmount: total.toString(),
    participantCount: participants.size,
    assetStats,
  };
}

export async function getUnclaimedLaunchpoolRewards(wallet: string) {
  return prisma.launchpoolReward.findMany({
    where: {
      walletAddress: { equals: wallet, mode: "insensitive" },
      claimedAt: null,
    },
    include: { launchpool: { select: { id: true, title: true } } },
    orderBy: { accruedAt: "desc" },
  });
}

export async function markLaunchpoolRewardsClaimed(wallet: string) {
  await prisma.launchpoolReward.updateMany({
    where: {
      walletAddress: { equals: wallet, mode: "insensitive" },
      claimedAt: null,
    },
    data: { claimedAt: new Date() },
  });
}

export async function distributeLaunchpoolRewards(launchpoolId: string) {
  const pool = await prisma.launchpool.findUnique({ where: { id: launchpoolId } });
  if (!pool) {
    throw new Error("Launchpool not found");
  }

  const stakes = await prisma.launchpoolStake.findMany({
    where: { launchpoolId, isActive: true },
  });

  if (stakes.length === 0) {
    return { distributed: 0, participants: 0 };
  }

  let totalStaked = 0n;
  for (const stake of stakes) {
    try {
      totalStaked += BigInt(stake.amount || "0");
    } catch {
      /* skip */
    }
  }

  if (totalStaked <= 0n) {
    return { distributed: 0, participants: stakes.length };
  }

  const rewardTotal = BigInt(pool.totalRewardAmount || "0");
  let distributed = 0;

  for (const stake of stakes) {
    const stakeAmount = BigInt(stake.amount || "0");
    if (stakeAmount <= 0n) continue;
    const share = (rewardTotal * stakeAmount) / totalStaked;
    if (share <= 0n) continue;

    await prisma.launchpoolReward.create({
      data: {
        launchpoolId,
        walletAddress: stake.walletAddress.toLowerCase(),
        amount: share.toString(),
        tokenSymbol: pool.rewardTokenSymbol,
        tokenAddress: pool.rewardTokenAddress,
      },
    });
    distributed += 1;
  }

  await prisma.launchpool.update({
    where: { id: launchpoolId },
    data: { rewardsDistributed: true },
  });

  return { distributed, participants: stakes.length };
}
