import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { mapTokenListRow, tokenListSelect } from "@/lib/analytics/token-list";
import { buildDiscoverWhere, parseDiscoverFilters } from "@/lib/discover-filters";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 24), 500);
  const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());
  const filters = parseDiscoverFilters(searchParams);

  try {
    const tokens = await prisma.tokenProject.findMany({
      where: buildDiscoverWhere(chainId, filters),
      orderBy: [
        { viewCount: "desc" },
        { holderCount: "desc" },
        { volume24h: "desc" },
        { txCount24h: "desc" },
        { lastActivity: "desc" },
      ],
      take: limit,
      select: tokenListSelect,
    });

    return NextResponse.json(
      { tokens: tokens.map(mapTokenListRow) },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } }
    );
  } catch (e) {
    console.error("[GET /api/tokens/trending]", e);
    return NextResponse.json({ error: "Failed to load trending tokens" }, { status: 500 });
  }
}
