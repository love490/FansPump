import { NextResponse } from "next/server";
import { discoverPlatformPools, getLiquidityPoolAnalytics, listLiquidityPools } from "@/lib/pools/index";

/** Discover and index pools from on-chain DEX pairs for platform tokens. */
export async function POST() {
  try {
    const synced = await discoverPlatformPools();
    const [pools, analytics] = await Promise.all([listLiquidityPools(), getLiquidityPoolAnalytics()]);

    return NextResponse.json({
      syncedCount: synced.length,
      pools,
      analytics: {
        ...analytics,
        note: "Pools indexed from on-chain liquidity.",
      },
    });
  } catch (e) {
    console.error("[POST /api/pools/discover]", e);
    return NextResponse.json({ error: "Failed to discover pools" }, { status: 500 });
  }
}
