import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import {
  adminEmailSchema,
  verifyAdminPassword,
} from "@/lib/admin/password";
import {
  attachSessionCookie,
  createAdminSessionRecord,
} from "@/lib/admin/server-session";
import { bootstrapAdminFromEnv } from "@/lib/admin/bootstrap";

const loginSchema = z.object({
  email: adminEmailSchema,
  password: z.string().min(1, "Password is required"),
});

function isMissingAdminTables(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /admins|admin_sessions|admin_activity_logs|does not exist|Unknown arg/i.test(message);
}

export async function POST(request: NextRequest) {
  try {
    const bootstrap = await bootstrapAdminFromEnv();

    const body = loginSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      if (bootstrap.adminCount === 0 && !bootstrap.configured) {
        return NextResponse.json(
          {
            error:
              "No admin account exists yet. Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in Railway, redeploy, then sign in.",
          },
          { status: 503 }
        );
      }

      try {
        await logAdminAction(email, "LOGIN_FAILED", { reason: "unknown_email" }, request);
      } catch (auditError) {
        console.error("[admin/auth/login] audit log failed:", auditError);
      }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const validPassword = await verifyAdminPassword(body.password, admin.passwordHash);
    if (!validPassword) {
      try {
        await logAdminAction(email, "LOGIN_FAILED", { reason: "invalid_password" }, request, admin.id);
      } catch (auditError) {
        console.error("[admin/auth/login] audit log failed:", auditError);
      }
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = await createAdminSessionRecord(admin.id, {
      pending2FA: admin.twoFactorEnabled,
      request,
    });

    const response = NextResponse.json({
      ok: true,
      requires2FA: admin.twoFactorEnabled,
      email: admin.email,
      role: admin.role,
    });

    attachSessionCookie(response, session.token, session.expiresAt);

    try {
      if (admin.twoFactorEnabled) {
        await logAdminAction(email, "LOGIN_PASSWORD_OK_2FA_PENDING", {}, request, admin.id);
      } else {
        await logAdminAction(email, "LOGIN_SUCCESS", {}, request, admin.id);
      }
    } catch (auditError) {
      console.error("[admin/auth/login] audit log failed:", auditError);
    }

    return response;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (isMissingAdminTables(e)) {
      return NextResponse.json(
        {
          error:
            "Admin database tables are missing. Ensure Railway runs pnpm db:push on deploy, then try again.",
        },
        { status: 503 }
      );
    }
    console.error("[admin/auth/login]", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
