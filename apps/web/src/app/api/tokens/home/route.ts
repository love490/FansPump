import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";
import {
  mapTokenListRowSafe,
  tokenListSelect,
} from "@/lib/analytics/token-list";
import {
  buildHomePreviewSections,
  sortTokensNewest,
  sortTokensTrending,
} from "@/lib/tokens/home-sections";

const POOL_LIMIT = 100;
const MARKET_LIMIT = 50;
const PREVIEW_LIMIT = 24;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());

  try {
    const rows = await prisma.tokenProject.findMany({
      where: { chainId },
      orderBy: { createdAt: "desc" },
      take: POOL_LIMIT,
      select: tokenListSelect,
    });

    const pool = mapTokenListRowSafe(rows);

    const market = [...pool]
      .sort(
        (a, b) =>
          (b.trustScore ?? 0) - (a.trustScore ?? 0) ||
          (b.volumeTotal ?? 0) - (a.volumeTotal ?? 0)
      )
      .slice(0, MARKET_LIMIT);

    const { trending, newest } = buildHomePreviewSections({
      market,
      trending: sortTokensTrending(pool).slice(0, PREVIEW_LIMIT),
      newest: sortTokensNewest(pool).slice(0, PREVIEW_LIMIT),
      previewLimit: PREVIEW_LIMIT,
    });

    return NextResponse.json(
      { market, trending, new: newest },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } }
    );
  } catch (e) {
    console.error("[GET /api/tokens/home]", e);
    return NextResponse.json({ error: "Failed to load home tokens" }, { status: 500 });
  }
}
