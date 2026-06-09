import { NextResponse } from "next/server";
import { getPlatformSetting } from "@/lib/admin/platform-settings";

const TRUST_PANEL_KEY = "trust_panel_config";

const DEFAULT = {
  showVerifiedCreator: true,
  showOwnershipRenounced: true,
  showLiquidityLocked: true,
  showMintable: true,
  showBurnable: true,
  showBlacklist: true,
  showPausable: true,
  showAntiBot: true,
};

export async function GET() {
  try {
    const config = await getPlatformSetting(TRUST_PANEL_KEY, DEFAULT);
    return NextResponse.json(
      { config },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json({ config: DEFAULT });
  }
}
