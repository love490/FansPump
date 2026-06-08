import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type DiscoveryConfig } from "@/lib/admin/platform-settings";

const schema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  discovery: z.object({
    volumeWeight: z.number().min(0).max(100),
    txCountWeight: z.number().min(0).max(100),
    activityWeight: z.number().min(0).max(100),
    trendingWeight: z.number().min(0).max(100),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "discovery", "GET");
    const discovery = await platformSettings.getDiscovery();
    return NextResponse.json({ discovery });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load discovery settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { wallet, parsedBody } = await requirePermission(request, "discovery", "PATCH");
    const { discovery } = schema.parse(parsedBody);
    await platformSettings.setDiscovery(discovery as DiscoveryConfig, wallet);
    await logAdminAction(wallet, "SETTINGS_UPDATE", { section: "discovery", discovery }, request);
    return NextResponse.json({ ok: true, discovery });
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
