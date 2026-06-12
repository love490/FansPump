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
import { prisma } from "@iopn/database";

const schema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(16),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminSessionWithCsrf(request);
    const body = schema.parse(await request.json());

    const validPassword = await verifyAdminPassword(body.password, ctx.admin.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (
      ctx.admin.twoFactorEnabled &&
      ctx.admin.twoFactorSecret &&
      !verifyTotpCode(ctx.admin.twoFactorSecret, body.code)
    ) {
      return NextResponse.json({ error: "Invalid authentication code" }, { status: 401 });
    }

    await prisma.admin.update({
      where: { id: ctx.admin.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await logAdminAction(ctx.admin.email, "2FA_DISABLED", {}, request, ctx.admin.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[admin/auth/2fa/disable]", e);
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
  }
}
