import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type SecurityConfig } from "@/lib/admin/platform-settings";

const schema = z.object({
  security: z.object({
    tokenCreationPaused: z.boolean(),
    tradingPaused: z.boolean(),
    claimsPaused: z.boolean(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "security", "GET");
    const security = await platformSettings.getSecurity();
    return NextResponse.json({ security });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load security settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { email, admin, parsedBody } = await requirePermission(request, "security", "PATCH");
    const { security } = schema.parse(parsedBody);
    await platformSettings.setSecurity(security as SecurityConfig, email);
    await logAdminAction(email, "PAUSE_ACTION", { section: "security", security }, request, admin.id);
    return NextResponse.json({ ok: true, security });
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
