import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@iopn/database";
import { logAdminAction } from "@/lib/admin/audit-log";
import { adminPasswordSchema, hashAdminPassword } from "@/lib/admin/password";
import { destroyAllAdminSessions } from "@/lib/admin/server-session";

const schema = z.object({
  token: z.string().min(32),
  newPassword: adminPasswordSchema,
});

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const tokenHash = hashResetToken(body.token);

    const admin = await prisma.admin.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const passwordHash = await hashAdminPassword(body.newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await destroyAllAdminSessions(admin.id);
    await logAdminAction(admin.email, "PASSWORD_RESET_COMPLETED", {}, request, admin.id);

    return NextResponse.json({ ok: true, message: "Password reset successful. Please sign in." });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("[admin/auth/reset-password]", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
