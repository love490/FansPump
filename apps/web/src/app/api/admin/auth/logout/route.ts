import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { getSessionFromRequest, destroySessionByToken } from "@/lib/admin/server-session";

export async function POST(request: NextRequest) {
  try {
    const ctx = await getSessionFromRequest(request);
    if (ctx) {
      await destroySessionByToken(ctx.token);
      await logAdminAction(ctx.admin.email, "LOGOUT", {}, request, ctx.admin.id);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
