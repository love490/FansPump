import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError, requireAdminAuth } from "@/lib/admin-auth";
import { ensureAdminProfile } from "@/lib/admin/roles";
import { logAdminAction } from "@/lib/admin/audit-log";
import { getRolePermissions } from "@/lib/admin/roles";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const wallet = await requireAdminAuth(body);
    const role = await ensureAdminProfile(wallet);
    try {
      await logAdminAction(wallet, "ADMIN_LOGIN", {}, request);
    } catch (auditError) {
      console.error("Admin login audit log failed:", auditError);
    }
    return NextResponse.json({
      authorized: true,
      role,
      permissions: getRolePermissions(role),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("Admin authorize failed:", e);
    const message = e instanceof Error ? e.message : "Authorization failed";
    const missingTables =
      /admin_profiles|admin_activity_logs|does not exist|Unknown arg/i.test(message);
    return NextResponse.json(
      {
        error: missingTables
          ? "Admin database tables are missing. Run pnpm db:push on the production database."
          : message || "Authorization failed",
      },
      { status: missingTables ? 503 : 500 }
    );
  }
}
