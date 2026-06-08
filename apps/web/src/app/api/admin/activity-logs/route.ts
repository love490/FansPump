import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { getActivityLogs } from "@/lib/admin/audit-log";

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "activity_logs", "GET");
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
    const { logs, total } = await getActivityLogs(limit, offset);
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        admin: l.adminWallet,
        action: l.action,
        details: l.details,
        ipAddress: l.ipAddress,
        timestamp: l.createdAt.toISOString(),
      })),
      total,
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
