import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { requireAdminSessionWithCsrf } from "@/lib/admin/api-auth";
import {
  generateBackupCodes,
  hashBackupCodes,
  verifyTotpCode,
} from "@/lib/admin/totp";
import { prisma } from "@iopn/database";

const schema = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminSessionWithCsrf(request);
    const { code } = schema.parse(await request.json());

    if (!ctx.admin.twoFactorSecret) {
      return NextResponse.json({ error: "Run 2FA setup first" }, { status: 400 });
    }

    if (!verifyTotpCode(ctx.admin.twoFactorSecret, code)) {
      return NextResponse.json({ error: "Invalid authentication code" }, { status: 401 });
    }

    const backupCodes = generateBackupCodes();
    await prisma.admin.update({
      where: { id: ctx.admin.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashBackupCodes(backupCodes),
      },
    });

    await logAdminAction(ctx.admin.email, "2FA_ENABLED", {}, request, ctx.admin.id);

    return NextResponse.json({
      ok: true,
      backupCodes,
      message: "Save these backup codes in a secure place. They will not be shown again.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid 6-digit code" }, { status: 400 });
    }
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[admin/auth/2fa/enable]", e);
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 });
  }
}
