import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type PoolShareConfig } from "@/lib/admin/platform-settings";

const schema = z.object({
  poolShare: z.object({
    poolSharePercentage: z.number().min(0).max(100),
    poolReserveTarget: z.string(),
    liquidityIncentiveEnabled: z.boolean(),
    trackingOnly: z.boolean(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "pool_share", "GET");
    const poolShare = await platformSettings.getPoolShare();
    return NextResponse.json({ poolShare });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load pool share" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { email, admin, parsedBody } = await requirePermission(request, "pool_share", "PATCH");
    const { poolShare } = schema.parse(parsedBody);
    await platformSettings.setPoolShare(poolShare as PoolShareConfig, email);
    await logAdminAction(email, "SETTINGS_UPDATE", { section: "pool_share", poolShare }, request, admin.id);
    return NextResponse.json({ ok: true, poolShare });
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
