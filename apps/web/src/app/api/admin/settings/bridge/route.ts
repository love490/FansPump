import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type BridgeConfig } from "@/lib/admin/platform-settings";

const schema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  bridge: z.object({
    bridgeFeeBps: z.number().min(0).max(10_000),
    supportedChains: z.array(z.string()),
    bridgeTreasuryWallet: z.string(),
    enabled: z.boolean(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "bridge", "GET");
    const bridge = await platformSettings.getBridge();
    return NextResponse.json({ bridge });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load bridge settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { wallet, parsedBody } = await requirePermission(request, "bridge", "PATCH");
    const { bridge } = schema.parse(parsedBody);
    await platformSettings.setBridge(bridge as BridgeConfig, wallet);
    await logAdminAction(wallet, "SETTINGS_UPDATE", { section: "bridge", bridge }, request);
    return NextResponse.json({ ok: true, bridge });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
