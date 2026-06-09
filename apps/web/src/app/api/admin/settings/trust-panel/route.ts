import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { getPlatformSetting, setPlatformSetting } from "@/lib/admin/platform-settings";

const TRUST_PANEL_KEY = "trust_panel_config";

export type TrustPanelConfig = {
  showVerifiedCreator: boolean;
  showOwnershipRenounced: boolean;
  showLiquidityLocked: boolean;
  showMintable: boolean;
  showBurnable: boolean;
  showBlacklist: boolean;
  showPausable: boolean;
  showAntiBot: boolean;
};

const DEFAULT_TRUST_PANEL: TrustPanelConfig = {
  showVerifiedCreator: true,
  showOwnershipRenounced: true,
  showLiquidityLocked: true,
  showMintable: true,
  showBurnable: true,
  showBlacklist: true,
  showPausable: true,
  showAntiBot: true,
};

const configSchema = z.object({
  showVerifiedCreator: z.boolean(),
  showOwnershipRenounced: z.boolean(),
  showLiquidityLocked: z.boolean(),
  showMintable: z.boolean(),
  showBurnable: z.boolean(),
  showBlacklist: z.boolean(),
  showPausable: z.boolean(),
  showAntiBot: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "trust_panel", "GET");
    const config = await getPlatformSetting(TRUST_PANEL_KEY, DEFAULT_TRUST_PANEL);
    return NextResponse.json({ config });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load trust panel config" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { parsedBody } = await requirePermission(request, "trust_panel", "PATCH");
    const config = configSchema.parse(parsedBody.config);
    await setPlatformSetting(TRUST_PANEL_KEY, config);
    return NextResponse.json({ config });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to save trust panel config" }, { status: 500 });
  }
}
