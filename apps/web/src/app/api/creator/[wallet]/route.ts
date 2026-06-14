import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { isAddress } from "viem";
import { mapTokenListRow, tokenListSelect } from "@/lib/analytics/token-list";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { ensureCreatorProfile, resolveCreatorStatus } from "@/lib/v2/reputation";
import { deriveCreatorBadges } from "@/lib/v2/badges";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet: raw } = await params;
  const wallet = raw.toLowerCase();

  if (!isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const chainId = getActiveChainId();

  try {
    await ensureCreatorProfile(wallet);

    const [verification, user, tokens, earnings, swapStats, announcementCount, profile, liquidityAdded, followerCount, followingCount] =
      await Promise.all([
      prisma.creatorVerification.findUnique({ where: { walletAddress: wallet } }),
      prisma.user.findUnique({
        where: { walletAddress: wallet },
        select: { username: true },
      }),
      prisma.tokenProject.findMany({
        where: { creatorAddress: wallet, chainId },
        orderBy: { createdAt: "desc" },
        select: tokenListSelect,
      }),
      prisma.creatorEarning.findMany({
        where: { creatorAddress: wallet },
        select: { amount: true },
      }),
      prisma.swapActivity.count({
        where: { token: { creatorAddress: wallet, chainId } },
      }),
      prisma.tokenAnnouncement.count({
        where: { creatorWallet: wallet, isHidden: false },
      }),
      prisma.creatorProfile.findUnique({ where: { walletAddress: wallet } }),
      prisma.tokenProject.aggregate({
        where: { creatorAddress: wallet, chainId },
        _sum: { poolStrength: true },
      }),
      prisma.creatorFollow.count({ where: { creatorWallet: wallet } }),
      prisma.creatorFollow.count({ where: { followerWallet: wallet } }),
    ]);

    await prisma.creatorProfile.update({
      where: { walletAddress: wallet },
      data: { totalViews: { increment: 1 } },
    }).catch(() => {});

    const flags = getV2FeatureFlags();
    const walletVerified = !!verification;
    const creatorStatus = resolveCreatorStatus({
      profileStatus: profile?.status ?? "ANONYMOUS",
      walletVerified,
      reputationScore: profile?.reputationScore ?? 0,
    });

    const avgTrust =
      tokens.length > 0
        ? tokens.reduce((acc, t) => acc + (t.trustScore ?? 0), 0) / tokens.length
        : 0;

    const creatorBadges = deriveCreatorBadges({
      badges: profile?.badges ?? [],
      reputationScore: profile?.reputationScore ?? 0,
      tokensCreated: tokens.length,
      joinedAt: profile?.joinedAt ?? tokens[tokens.length - 1]?.createdAt ?? new Date(),
      walletVerified,
      status: creatorStatus,
    });

    const creatorEarningsWei = earnings.reduce(
      (acc, row) => acc + BigInt(row.amount || "0"),
      0n
    );
    const totalTrades = swapStats;
    const totalVolume = tokens.reduce((acc, t) => acc + (t.volumeTotal ?? 0), 0);

    return NextResponse.json({
      profile: {
        walletAddress: wallet,
        username: user?.username ?? null,
        walletVerified,
        verifiedAt: verification?.verifiedAt?.toISOString() ?? null,
        tokensCreated: tokens.length,
        totalVolume,
        totalTrades,
        creatorEarningsWei: creatorEarningsWei.toString(),
        announcementCount,
        followers: followerCount,
        following: followingCount,
        tokens: tokens.map(mapTokenListRow),
        ...(flags.creatorProfiles
          ? {
              creatorStatus,
              joinedAt: profile?.joinedAt?.toISOString() ?? null,
              reputationScore: profile?.reputationScore ?? 0,
              fansPumpXp: profile?.fansPumpXp ?? 0,
              totalViews: (profile?.totalViews ?? 0) + 1,
              avgTrustScore: Math.round(avgTrust),
              liquidityAdded: liquidityAdded._sum.poolStrength ?? 0,
              badges: creatorBadges,
              questsCompleted: profile?.questsCompleted ?? 0,
            }
          : {}),
      },
    });
  } catch (e) {
    console.error("[GET /api/creator/:wallet]", e);
    return NextResponse.json({ error: "Failed to load creator profile" }, { status: 500 });
  }
}
