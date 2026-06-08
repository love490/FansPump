import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { mapTokenListRow, tokenListSelect } from "@/lib/analytics/token-list";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());

  if (!q) {
    return NextResponse.json({ tokens: [] });
  }

  try {
    const tokens = await prisma.tokenProject.findMany({
      where: {
        chainId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { symbol: { contains: q, mode: "insensitive" } },
          { contractAddress: { contains: q.toLowerCase() } },
        ],
      },
      orderBy: [{ volume24h: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: tokenListSelect,
    });

    return NextResponse.json(
      { tokens: tokens.map(mapTokenListRow) },
      { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } }
    );
  } catch (e) {
    console.error("[GET /api/tokens/search]", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
