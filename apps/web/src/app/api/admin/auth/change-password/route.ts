import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { requireAdminSessionWithCsrf } from "@/lib/admin/api-auth";
import {
  adminPasswordSchema,
  hashAdminPassword,
  verifyAdminPassword,
} from "@/lib/admin/password";
import { verifyTotpCode } from "@/lib/admin/totp";
import { destroyAllAdminSessions } from "@/lib/admin/server-session";
import { prisma } from "@iopn/database";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: adminPasswordSchema,
  code: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminSessionWithCsrf(request);
    const body = schema.parse(await request.json());

    const validPassword = await verifyAdminPassword(body.currentPassword, ctx.admin.passwordHash);
    if (!validPassword) {
      await logAdminAction(ctx.admin.email, "PASSWORD_CHANGE_FAILED", { reason: "bad_password" }, request, ctx.admin.id);
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    if (ctx.admin.twoFactorEnabled) {
      if (!body.code || !ctx.admin.twoFactorSecret || !verifyTotpCode(ctx.admin.twoFactorSecret, body.code)) {
        return NextResponse.json({ error: "Valid 2FA code required" }, { status: 401 });
      }
    }

    const passwordHash = await hashAdminPassword(body.newPassword);
    await prisma.admin.update({
      where: { id: ctx.admin.id },
      data: { passwordHash },
    });

    await destroyAllAdminSessions(ctx.admin.id);
    await logAdminAction(ctx.admin.email, "PASSWORD_CHANGED", {}, request, ctx.admin.id);

    return NextResponse.json({
      ok: true,
      message: "Password updated. Please sign in again.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[admin/auth/change-password]", e);
    return NextResponse.json({ error: "Password change failed" }, { status: 500 });
  }
}
