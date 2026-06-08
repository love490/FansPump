import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type SystemConfig } from "@/lib/admin/platform-settings";

const schema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  system: z.object({
    platformName: z.string().min(1),
    platformDescription: z.string(),
    announcementBanner: z.string(),
    maintenanceMode: z.boolean(),
    supportEmail: z.string(),
    supportUrl: z.string(),
    socialLinks: z.object({
      twitter: z.string().optional(),
      telegram: z.string().optional(),
      discord: z.string().optional(),
    }),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "system", "GET");
    const system = await platformSettings.getSystem();
    return NextResponse.json({ system });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load system settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { wallet, parsedBody } = await requirePermission(request, "system", "PATCH");
    const { system } = schema.parse(parsedBody);
    await platformSettings.setSystem(system as SystemConfig, wallet);
    await logAdminAction(wallet, "SETTINGS_UPDATE", { section: "system", system }, request);
    return NextResponse.json({ ok: true, system });
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
