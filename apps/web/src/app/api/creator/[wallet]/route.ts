import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { isAddress } from "viem";
import { mapTokenListRow, tokenListSelect } from "@/lib/analytics/token-list";
import { getActiveChainId } from "@/lib/chain-config/opn";

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
    const [verification, tokens, earnings, swapStats, announcementCount] = await Promise.all([
      prisma.creatorVerification.findUnique({ where: { walletAddress: wallet } }),
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
    ]);

    const creatorEarningsWei = earnings.reduce(
      (acc, row) => acc + BigInt(row.amount || "0"),
      0n
    );
    const totalTrades = swapStats;
    const totalVolume = tokens.reduce((acc, t) => acc + (t.volumeTotal ?? 0), 0);

    return NextResponse.json({
      profile: {
        walletAddress: wallet,
        walletVerified: !!verification,
        verifiedAt: verification?.verifiedAt?.toISOString() ?? null,
        tokensCreated: tokens.length,
        totalVolume,
        totalTrades,
        creatorEarningsWei: creatorEarningsWei.toString(),
        announcementCount,
        followers: 0,
        following: 0,
        tokens: tokens.map(mapTokenListRow),
      },
    });
  } catch (e) {
    console.error("[GET /api/creator/:wallet]", e);
    return NextResponse.json({ error: "Failed to load creator profile" }, { status: 500 });
  }
}
