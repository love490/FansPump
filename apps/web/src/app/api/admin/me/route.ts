import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminFromQuery } from "@/lib/admin/api-auth";
import { getRolePermissions } from "@/lib/admin/roles";

export async function GET(request: NextRequest) {
  try {
    const { wallet, role } = await requireAdminFromQuery(request);
    return NextResponse.json({
      wallet,
      role,
      permissions: getRolePermissions(role),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
