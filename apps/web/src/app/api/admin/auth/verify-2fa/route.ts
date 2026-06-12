import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePending2FASession } from "@/lib/admin/api-auth";
import {
  attachSessionCookie,
  completePending2FASession,
} from "@/lib/admin/server-session";
import {
  hashBackupCode,
  verifyBackupCode,
  verifyTotpCode,
} from "@/lib/admin/totp";
import { prisma } from "@iopn/database";

const schema = z.object({
  code: z.string().min(6).max(16),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePending2FASession(request);
    const { code } = schema.parse(await request.json());
    const admin = ctx.admin;

    let verified = false;
    let usedBackup = false;

    if (admin.twoFactorSecret && verifyTotpCode(admin.twoFactorSecret, code)) {
      verified = true;
    } else if (admin.twoFactorBackupCodes.length > 0) {
      const index = verifyBackupCode(code, admin.twoFactorBackupCodes);
      if (index >= 0) {
        verified = true;
        usedBackup = true;
        const remaining = [...admin.twoFactorBackupCodes];
        remaining.splice(index, 1);
        await prisma.admin.update({
          where: { id: admin.id },
          data: { twoFactorBackupCodes: remaining },
        });
      }
    }

    if (!verified) {
      await logAdminAction(admin.email, "LOGIN_2FA_FAILED", {}, request, admin.id);
      return NextResponse.json({ error: "Invalid authentication code" }, { status: 401 });
    }

    const expiresAt = await completePending2FASession(ctx.session.id);
    await logAdminAction(
      admin.email,
      usedBackup ? "LOGIN_SUCCESS_BACKUP_CODE" : "LOGIN_SUCCESS_2FA",
      { usedBackup },
      request,
      admin.id
    );

    const response = NextResponse.json({
      ok: true,
      email: admin.email,
      role: admin.role,
      csrfToken: ctx.csrfToken,
    });

    attachSessionCookie(response, ctx.token, expiresAt);
    return response;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid 6-digit code" }, { status: 400 });
    }
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[admin/auth/verify-2fa]", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
