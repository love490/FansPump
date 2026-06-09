import { NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";

export async function GET() {
  try {
    const chainId = getActiveChainId();

    const [tokenCount, verificationCount, voteCount, creatorGroups, announcementCount] = await Promise.all([
      prisma.tokenProject.count({ where: { chainId } }),
      prisma.creatorVerification.count(),
      prisma.tokenVote.count(),
      prisma.tokenProject.groupBy({
        by: ["creatorAddress"],
        where: { chainId },
      }),
      prisma.tokenAnnouncement.count({ where: { isHidden: false } }),
    ]);

    return NextResponse.json(
      {
        stats: {
          tokenCount,
          verificationCount,
          verifiedCreatorCount: verificationCount,
          voteCount,
          creatorCount: creatorGroups.length,
          announcementCount,
          chainId,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (e) {
    console.error("[GET /api/stats]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Failed to load stats",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      },
      { status: 500 }
    );
  }
}
