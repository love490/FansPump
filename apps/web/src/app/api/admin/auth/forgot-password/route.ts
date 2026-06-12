import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@iopn/database";
import { logAdminAction } from "@/lib/admin/audit-log";
import { adminEmailSchema, normalizeAdminEmail } from "@/lib/admin/password";

const schema = z.object({
  email: adminEmailSchema,
});

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = schema.parse(await request.json());
    const email = normalizeAdminEmail(rawEmail);

    const admin = await prisma.admin.findUnique({ where: { email } });

    // Always return success to avoid email enumeration
    if (admin) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          passwordResetToken: hashResetToken(token),
          passwordResetExpires: expires,
        },
      });

      await logAdminAction(email, "PASSWORD_RESET_REQUESTED", {}, request, admin.id);

      if (process.env.NODE_ENV !== "production") {
        console.info(`[admin] Password reset token for ${email}: ${token}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, reset instructions have been sent.",
      ...(process.env.NODE_ENV !== "production" && admin
        ? { devResetToken: "Check server logs for reset token in development" }
        : {}),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid email" }, { status: 400 });
    }
    console.error("[admin/auth/forgot-password]", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
