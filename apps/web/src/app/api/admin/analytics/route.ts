import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { getAdminOverview } from "@/lib/admin/overview";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "analytics", "GET");
    const format = request.nextUrl.searchParams.get("format");
    const overview = await getAdminOverview();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [trades24h, topTokens, creatorEarningRows, treasury] = await Promise.all([
      prisma.swapActivity.count({ where: { blockTime: { gte: since24h } } }),
      prisma.tokenProject.findMany({
        orderBy: { volumeTotal: "desc" },
        take: 10,
        select: { name: true, symbol: true, contractAddress: true, volumeTotal: true, volume24h: true },
      }),
      prisma.creatorEarning.findMany({
        select: { creatorAddress: true, amount: true },
      }),
      prisma.platformTreasuryLedger.findUnique({ where: { id: "global" } }),
    ]);

    const creatorTotals = new Map<string, bigint>();
    for (const row of creatorEarningRows) {
      const key = row.creatorAddress.toLowerCase();
      creatorTotals.set(key, (creatorTotals.get(key) ?? 0n) + BigInt(row.amount));
    }
    const topCreators = [...creatorTotals.entries()]
      .map(([creator, total]) => ({
        creator,
        earningsOpn: weiToOpnFloat(total),
      }))
      .sort((a, b) => b.earningsOpn - a.earningsOpn)
      .slice(0, 10);

    const analytics = {
      totalVolume: overview.totalTradingVolume,
      volume24h: overview.volume24h,
      volume7d: overview.volume7d,
      totalTrades: overview.latestTransactions.length,
      trades24h,
      topTokens,
      topCreators,
      revenueBreakdown: {
        platformTreasuryOpn: treasury ? weiToOpnFloat(BigInt(treasury.totalWei)) : 0,
        creatorEarningsOpn: overview.totalCreatorEarnings,
      },
    };

    if (format === "csv") {
      const rows = [
        ["Metric", "Value"],
        ["Total Volume", String(analytics.totalVolume)],
        ["24h Volume", String(analytics.volume24h)],
        ["7d Volume", String(analytics.volume7d)],
        ["24h Trades", String(analytics.trades24h)],
        ["Platform Revenue", String(analytics.revenueBreakdown.platformTreasuryOpn)],
        ["Creator Earnings", String(analytics.revenueBreakdown.creatorEarningsOpn)],
        [],
        ["Top Tokens", "Symbol", "Volume Total"],
        ...topTokens.map((t) => [t.name, t.symbol, String(t.volumeTotal)]),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="fanspump-analytics.csv"',
        },
      });
    }

    return NextResponse.json({ analytics });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
