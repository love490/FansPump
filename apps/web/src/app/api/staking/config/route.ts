import { NextResponse } from "next/server";
import { getStakingPlatformConfig } from "@/lib/staking/config";

/** Public read-only staking configuration (no reward distribution). */
export async function GET() {
  try {
    const config = await getStakingPlatformConfig();
    return NextResponse.json({
      config: {
        tiers: config.tiers,
        visibilityBoostEnabled: config.visibilityBoostEnabled,
        discoveryRankingBoostEnabled: config.discoveryRankingBoostEnabled,
        opnStakingEnabled: config.opnStakingEnabled,
        lpStakingEnabled: config.lpStakingEnabled,
        supportedLpPools: config.supportedLpPools.filter((p) => p.enabled),
        rewardsActive: false,
        apyEnabled: false,
      },
    });
  } catch (e) {
    console.error("[GET /api/staking/config]", e);
    return NextResponse.json({ error: "Failed to load staking config" }, { status: 500 });
  }
}
