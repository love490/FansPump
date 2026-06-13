import { NextRequest, NextResponse } from "next/server";
import { discoverPlatformPools, getLiquidityPoolAnalytics, listLiquidityPools } from "@/lib/pools/index";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const token = request.nextUrl.searchParams.get("token")?.toLowerCase();
    const shouldDiscover = request.nextUrl.searchParams.get("discover") === "true";

    if (shouldDiscover) {
      await discoverPlatformPools();
    }

    let pools = await listLiquidityPools(Number.isFinite(limit) ? limit : 50);

    if (token) {
      pools = pools.filter(
        (p) => p.token0.toLowerCase() === token || p.token1.toLowerCase() === token
      );
    }

    const analytics = await getLiquidityPoolAnalytics();

    return NextResponse.json({
      pools,
      analytics: {
        ...analytics,
        note: "Read-only analytics — AMM math and reward emissions are not active yet.",
      },
    });
  } catch (e) {
    console.error("[GET /api/pools]", e);
    return NextResponse.json({ error: "Failed to load pools" }, { status: 500 });
  }
}
