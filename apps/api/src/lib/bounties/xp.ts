import type { Prisma } from "@iopn/database";
import prisma from "../prisma";
import { ensureCreatorProfile } from "../v2/reputation";

export type BountyLeaderboardEntry = {
  rank: number;
  walletAddress: string;
  username: string | null;
  profileImageUrl: string | null;
  totalXp: number;
  questsCompleted: number;
};

type Tx = Prisma.TransactionClient;

export async function awardBountyCompletionXp(
  participationId: string,
  options?: { tx?: Tx; xpAmount?: number }
): Promise<number> {
  const db = options?.tx ?? prisma;

  const participation = await db.bountyParticipation.findUnique({
    where: { id: participationId },
    include: { bounty: { select: { xpReward: true } } },
  });

  if (!participation) return 0;
  if (participation.xpAwarded > 0) return participation.xpAwarded;

  const xp = options?.xpAmount ?? participation.bounty.xpReward;
  if (xp <= 0) return 0;

  const allowedStatuses = ["VERIFIED", "CLAIMED"];
  if (!allowedStatuses.includes(participation.status)) return 0;

  await ensureCreatorProfile(participation.walletAddress);

  await db.bountyParticipation.update({
    where: { id: participationId },
    data: { xpAwarded: xp },
  });

  await db.creatorProfile.update({
    where: { walletAddress: participation.walletAddress },
    data: { fansPumpXp: { increment: xp } },
  });

  return xp;
}

export async function getCreatorBountyLeaderboard(
  creatorWallet: string,
  options?: { tokenAddress?: string; limit?: number }
): Promise<{
  creatorWallet: string;
  tokenAddress: string | null;
  totalQuests: number;
  leaderboard: BountyLeaderboardEntry[];
}> {
  const wallet = creatorWallet.toLowerCase();
  const tokenAddress = options?.tokenAddress?.toLowerCase() ?? null;
  const limit = Math.min(options?.limit ?? 50, 100);

  const bountyWhere: Prisma.BountyWhereInput = {
    creatorWallet: wallet,
    ...(tokenAddress ? { tokenAddress } : {}),
  };

  const [totalQuests, grouped] = await Promise.all([
    prisma.bounty.count({ where: bountyWhere }),
    prisma.bountyParticipation.groupBy({
      by: ["walletAddress"],
      where: {
        xpAwarded: { gt: 0 },
        bounty: bountyWhere,
      },
      _sum: { xpAwarded: true },
      _count: { id: true },
      orderBy: { _sum: { xpAwarded: "desc" } },
      take: limit,
    }),
  ]);

  if (grouped.length === 0) {
    return { creatorWallet: wallet, tokenAddress, totalQuests, leaderboard: [] };
  }

  const wallets = grouped.map((row) => row.walletAddress);
  const users = await prisma.user.findMany({
    where: { walletAddress: { in: wallets } },
    select: { walletAddress: true, username: true, profileImageUrl: true },
  });
  const userByWallet = new Map(users.map((u) => [u.walletAddress, u]));

  const leaderboard: BountyLeaderboardEntry[] = grouped.map((row, index) => {
    const user = userByWallet.get(row.walletAddress);
    return {
      rank: index + 1,
      walletAddress: row.walletAddress,
      username: user?.username ?? null,
      profileImageUrl: user?.profileImageUrl ?? null,
      totalXp: row._sum.xpAwarded ?? 0,
      questsCompleted: row._count.id,
    };
  });

  return { creatorWallet: wallet, tokenAddress, totalQuests, leaderboard };
}
