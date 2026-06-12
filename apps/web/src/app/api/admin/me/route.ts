import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminSession } from "@/lib/admin/api-auth";
import { getRolePermissions } from "@/lib/admin/roles";

export async function GET(request: NextRequest) {
  try {
    const { admin, csrfToken } = await requireAdminSession(request);
    return NextResponse.json({
      email: admin.email,
      role: admin.role,
      permissions: getRolePermissions(admin.role),
      csrfToken,
      twoFactorEnabled: admin.twoFactorEnabled,
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
