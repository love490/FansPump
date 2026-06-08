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
    await logAdminAction(wallet, "ADMIN_LOGIN", {}, request);
    return NextResponse.json({
      authorized: true,
      role,
      permissions: getRolePermissions(role),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Authorization failed" }, { status: 400 });
  }
}
