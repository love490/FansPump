import { NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { TOKEN_CATEGORIES } from "@iopn/shared";
import { getActiveChainId } from "@/lib/chain-config/opn";

export async function GET() {
  const chainId = getActiveChainId();

  try {
    const [
      verifiedCreatorCount,
      announcementStats,
      categoryGroups,
      creatorEarningRows,
      swapStats,
      volumeSum,
    ] = await Promise.all([
      prisma.creatorVerification.count(),
      prisma.tokenAnnouncement.groupBy({
        by: ["type"],
        _count: true,
        where: { isHidden: false },
      }),
      prisma.tokenProject.groupBy({
        by: ["category"],
        where: { chainId },
        _count: true,
      }),
      prisma.creatorEarning.findMany({ select: { amount: true } }),
      prisma.swapActivity.count({ where: { token: { chainId } } }),
      prisma.tokenProject.aggregate({
        where: { chainId },
        _sum: { volumeTotal: true },
      }),
    ]);

    const creatorEarningsWei = creatorEarningRows.reduce(
      (acc, row) => acc + BigInt(row.amount || "0"),
      0n
    );

    const categoryStats = TOKEN_CATEGORIES.map((cat) => {
      const row = categoryGroups.find((g) => g.category === cat);
      return { category: cat, count: row?._count ?? 0 };
    });

    const announcementStatistics = announcementStats.map((a) => ({
      type: a.type,
      count: a._count,
    }));

    return NextResponse.json({
      analytics: {
        verifiedCreatorCount,
        creatorEarningsWei: creatorEarningsWei.toString(),
        creatorEarningRecords: creatorEarningRows.length,
        totalVolume: volumeSum._sum.volumeTotal ?? 0,
        totalTrades: swapStats,
        categoryStats,
        announcementStatistics,
        chainId,
      },
    });
  } catch (e) {
    console.error("[GET /api/analytics/extended]", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
