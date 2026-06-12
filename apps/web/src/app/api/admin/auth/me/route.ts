import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { getRolePermissions } from "@/lib/admin/roles";
import { getSessionFromRequest } from "@/lib/admin/server-session";
import { bootstrapAdminFromEnv } from "@/lib/admin/bootstrap";

export async function GET(_request: NextRequest) {
  try {
    await bootstrapAdminFromEnv();

    const ctx = await getSessionFromRequest(_request);
    if (!ctx) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    if (ctx.session.pending2FA) {
      return NextResponse.json({
        authorized: false,
        requires2FA: true,
        email: ctx.admin.email,
      });
    }

    return NextResponse.json({
      authorized: true,
      email: ctx.admin.email,
      role: ctx.admin.role,
      permissions: getRolePermissions(ctx.admin.role),
      csrfToken: ctx.csrfToken,
      twoFactorEnabled: ctx.admin.twoFactorEnabled,
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
