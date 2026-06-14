import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { formatBountyReward } from "@/lib/bounties";
import { getCreatorEarningsTotal } from "@/lib/analytics/queries";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";
import {
  formatActivityAmount,
  sortActivities,
  type UserActivity,
} from "@/lib/dashboard/activities";
import { consolidateStakingPositions } from "@/lib/staking/consolidate";
import { serializeStakingPosition } from "@/lib/staking/config";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    await consolidateStakingPositions(wallet);

    const [
      tokensCreatedRows,
      liquidityLocks,
      bountiesCreatedRows,
      joinedQuests,
      completedParticipations,
      stakingRows,
    ] = await Promise.all([
      prisma.tokenProject.findMany({
        where: { creatorAddress: wallet },
        select: { id: true, symbol: true, name: true, contractAddress: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.liquidityLock.findMany({
        where: { creatorWallet: wallet },
        include: { token: { select: { symbol: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.bounty.findMany({
        where: { creatorWallet: wallet },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.bountyParticipation.findMany({
        where: { walletAddress: wallet },
        include: {
          bounty: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              rewardType: true,
              rewardAmount: true,
              rewardDescription: true,
              token: { select: { symbol: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.bountyParticipation.findMany({
        where: {
          walletAddress: wallet,
          bounty: { status: "COMPLETED" },
        },
        include: {
          bounty: {
            select: {
              id: true,
              title: true,
              completedAt: true,
              rewardType: true,
              rewardAmount: true,
              rewardDescription: true,
              token: { select: { symbol: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.stakingPosition.findMany({
        where: { wallet, isActive: true },
        orderBy: { stakedAt: "desc" },
      }),
    ]);

    const lockAmountWei = liquidityLocks.reduce((sum, row) => sum + BigInt(row.amount || "0"), 0n);

    const rewardSummaries = completedParticipations.map((p) =>
      formatBountyReward({
        rewardType: p.bounty.rewardType,
        rewardAmount: p.bounty.rewardAmount,
        rewardDescription: p.bounty.rewardDescription,
        tokenSymbol: p.bounty.token?.symbol ?? null,
      })
    );

    const opnRewards = completedParticipations
      .filter((p) => p.bounty.rewardType === "OPN")
      .reduce((sum, p) => sum + Number(p.bounty.rewardAmount || 0), 0);

    const creatorEarningsWei = await getCreatorEarningsTotal(wallet);
    const creatorEarningsOpn = weiToOpnFloat(BigInt(creatorEarningsWei || "0"));

    const stakingPositions = stakingRows.map(serializeStakingPosition);

    const activities: UserActivity[] = [];

    for (const stake of stakingRows) {
      activities.push({
        id: `stake-${stake.id}`,
        kind: "stake",
        title: stake.assetType === "OPN" ? "Staked OPN" : "Staked LP token",
        subtitle: stake.tier ? `Staking tier: ${stake.tier}` : "Recorded on FansPump",
        amount: formatActivityAmount(stake.amount, 18, stake.assetType === "OPN" ? "OPN" : "LP"),
        platform: "FansPump",
        occurredAt: stake.stakedAt.toISOString(),
        href: "/staking",
      });
    }

    for (const lock of liquidityLocks) {
      activities.push({
        id: `lock-${lock.id}`,
        kind: "lock",
        title: `Liquidity locked · ${lock.token.symbol}`,
        subtitle: `Unlocks ${lock.unlockAt.toLocaleDateString()}`,
        amount: formatActivityAmount(lock.amount, 18, "LP"),
        platform: "OPN Network",
        occurredAt: lock.createdAt.toISOString(),
        href: `/liquidity/${lock.tokenAddress}`,
      });
    }

    for (const token of tokensCreatedRows) {
      activities.push({
        id: `token-${token.id}`,
        kind: "token",
        title: `Created token · ${token.symbol}`,
        subtitle: token.name,
        platform: "FansPump",
        occurredAt: token.createdAt.toISOString(),
        href: `/token/${token.contractAddress}`,
      });
    }

    for (const row of joinedQuests) {
      activities.push({
        id: `quest-join-${row.id}`,
        kind: "quest",
        title: `Joined quest · ${row.bounty.title}`,
        subtitle: row.bounty.status === "COMPLETED" ? "Completed" : "In progress",
        platform: "FansPump",
        occurredAt: row.createdAt.toISOString(),
        href: "/earn",
      });
    }

    for (const row of completedParticipations) {
      const reward = formatBountyReward({
        rewardType: row.bounty.rewardType,
        rewardAmount: row.bounty.rewardAmount,
        rewardDescription: row.bounty.rewardDescription,
        tokenSymbol: row.bounty.token?.symbol ?? null,
      });
      activities.push({
        id: `quest-reward-${row.id}`,
        kind: "reward",
        title: `Quest reward · ${row.bounty.title}`,
        subtitle: reward,
        platform: "FansPump",
        occurredAt: (row.bounty.completedAt ?? row.createdAt).toISOString(),
        href: "/earn",
      });
    }

    for (const bounty of bountiesCreatedRows) {
      activities.push({
        id: `quest-created-${bounty.id}`,
        kind: "quest",
        title: `Created quest · ${bounty.title}`,
        platform: "FansPump",
        occurredAt: bounty.createdAt.toISOString(),
        href: "/earn",
      });
    }

    return NextResponse.json({
      stats: {
        tokensCreated: tokensCreatedRows.length,
        liquidityLocks: liquidityLocks.length,
        liquidityLockedAmount: lockAmountWei.toString(),
        questsCreated: bountiesCreatedRows.length,
        questsJoined: joinedQuests.length,
        questsCompleted: completedParticipations.length,
        rewardsEarned: rewardSummaries,
        rewardsEarnedOpn: opnRewards,
        creatorEarningsOpn,
        activeStakes: stakingRows.length,
      },
      stakingPositions,
      activities: sortActivities(activities),
    });
  } catch (e) {
    console.error("[GET /api/user/dashboard]", e);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
