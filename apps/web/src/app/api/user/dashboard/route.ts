import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { formatBountyReward } from "@/lib/bounties";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    const [
      tokensCreated,
      liquidityLocks,
      bountiesCreated,
      bountiesJoined,
      completedParticipations,
      stakingPositions,
    ] = await Promise.all([
      prisma.tokenProject.count({ where: { creatorAddress: wallet } }),
      prisma.liquidityLock.findMany({
        where: { creatorWallet: wallet },
        select: { id: true, amount: true, tokenAddress: true },
      }),
      prisma.bounty.count({ where: { creatorWallet: wallet } }),
      prisma.bountyParticipation.count({ where: { walletAddress: wallet } }),
      prisma.bountyParticipation.findMany({
        where: {
          walletAddress: wallet,
          bounty: { status: "COMPLETED" },
        },
        include: {
          bounty: {
            select: {
              rewardType: true,
              rewardAmount: true,
              rewardDescription: true,
              token: { select: { symbol: true } },
            },
          },
        },
      }),
      prisma.stakingPosition.count({ where: { wallet, isActive: true } }),
    ]);

    const lockCount = liquidityLocks.length;
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

    return NextResponse.json({
      stats: {
        tokensCreated,
        liquidityLocks: lockCount,
        liquidityLockedAmount: lockAmountWei.toString(),
        bountiesCreated,
        bountiesJoined,
        bountiesCompleted: completedParticipations.length,
        rewardsEarned: rewardSummaries,
        rewardsEarnedOpn: opnRewards,
        activeStakes: stakingPositions,
      },
    });
  } catch (e) {
    console.error("[GET /api/user/dashboard]", e);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
