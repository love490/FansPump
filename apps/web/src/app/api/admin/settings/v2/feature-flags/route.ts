import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { getPlatformSetting, setPlatformSetting } from "@/lib/admin/platform-settings";
import { getPublicV2FeatureFlags } from "@/lib/v2/feature-flags";

export type V2FeatureFlagOverrides = {
  trustScore?: boolean;
  creatorProfiles?: boolean;
  creatorQuests?: boolean;
  reputationSystem?: boolean;
  leaderboards?: boolean;
};

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "v2_platform", "GET");
    const envDefaults = getPublicV2FeatureFlags();
    const overrides = await getPlatformSetting<V2FeatureFlagOverrides>("v2_feature_flags", {});

    return NextResponse.json({
      envDefaults,
      overrides,
      effective: { ...envDefaults, ...overrides },
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { parsedBody, email } = await requirePermission(request, "v2_platform", "PATCH");
    const overrides = (parsedBody.overrides ?? {}) as V2FeatureFlagOverrides;
    await setPlatformSetting("v2_feature_flags", overrides, email);

    const envDefaults = getPublicV2FeatureFlags();
    return NextResponse.json({ effective: { ...envDefaults, ...overrides } });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
}
