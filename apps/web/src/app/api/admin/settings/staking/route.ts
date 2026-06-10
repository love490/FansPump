import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_STAKING_PLATFORM_CONFIG,
  type StakingPlatformConfig,
} from "@iopn/shared";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { getPlatformSetting, setPlatformSetting } from "@/lib/admin/platform-settings";
import { STAKING_CONFIG_KEY } from "@/lib/staking/config";

const tierSchema = z.object({
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
  minStakeOpn: z.string(),
  creationFeeDiscountBps: z.number().int().min(0).max(10000),
  visibilityBoost: z.number().min(0),
  rewardEligible: z.boolean(),
});

const lpPoolSchema = z.object({
  id: z.string(),
  label: z.string(),
  token0: z.string(),
  token1: z.string(),
  poolAddress: z.string().optional(),
  enabled: z.boolean(),
});

const configSchema = z.object({
  tiers: z.array(tierSchema),
  visibilityBoostEnabled: z.boolean().optional(),
  discoveryRankingBoostEnabled: z.boolean().optional(),
  opnStakingEnabled: z.boolean().optional(),
  lpStakingEnabled: z.boolean().optional(),
  supportedLpPools: z.array(lpPoolSchema).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "staking", "GET");
    const config = await getPlatformSetting(STAKING_CONFIG_KEY, DEFAULT_STAKING_PLATFORM_CONFIG);
    return NextResponse.json({ config });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load staking config" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { parsedBody } = await requirePermission(request, "staking", "PATCH");
    const config = configSchema.parse(parsedBody.config) as StakingPlatformConfig;
    await setPlatformSetting(STAKING_CONFIG_KEY, config);
    return NextResponse.json({ config });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to save staking config" }, { status: 500 });
  }
}
