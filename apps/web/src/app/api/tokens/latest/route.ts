import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { mapTokenListRow, tokenListSelect } from "@/lib/analytics/token-list";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 24), 100);
  const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());

  try {
    const tokens = await prisma.tokenProject.findMany({
      where: { chainId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: tokenListSelect,
    });

    return NextResponse.json(
      { tokens: tokens.map(mapTokenListRow) },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } }
    );
  } catch (e) {
    console.error("[GET /api/tokens/latest]", e);
    return NextResponse.json({ error: "Failed to load latest tokens" }, { status: 500 });
  }
}
