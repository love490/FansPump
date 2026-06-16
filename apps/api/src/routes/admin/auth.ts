import { Router } from "express";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { bootstrapAdminFromEnv } from "@/lib/admin/bootstrap";
import {
  adminEmailSchema,
  adminPasswordSchema,
  hashAdminPassword,
  normalizeAdminEmail,
  verifyAdminPassword,
} from "@/lib/admin/password";
import { getRolePermissions } from "@/lib/admin/roles";
import {
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  verifyTotpCode,
  generateTotpSecret,
  buildTotpQrDataUrl,
} from "@/lib/admin/totp";
import prisma from "../../lib/prisma";
import { asyncHandler } from "../../lib/http-helpers";
import { authRateLimit } from "../../middleware/rateLimit";
import { logAdminAction } from "../../lib/admin/express-audit";
import {
  requireAdminSession,
  requireAdminSessionWithCsrf,
  requirePending2FASession,
} from "../../lib/admin/express-api-auth";
import {
  attachSessionCookie,
  clearSessionCookie,
  completePending2FASession,
  createAdminSessionRecord,
  destroyAllAdminSessions,
  destroySessionByToken,
  getSessionFromRequest,
} from "../../lib/admin/express-session";
import { handleAdminError, isMissingAdminTables } from "../../lib/admin/handle-error";
import { createHash, randomBytes } from "crypto";

const router = Router();

router.use(authRateLimit);

const loginSchema = z.object({
  email: adminEmailSchema,
  password: z.string().min(1, "Password is required"),
});

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    try {
      const bootstrap = await bootstrapAdminFromEnv();
      const body = loginSchema.parse(req.body);
      const email = body.email.trim().toLowerCase();

      const admin = await prisma.admin.findUnique({ where: { email } });

      if (!admin) {
        if (bootstrap.adminCount === 0 && !bootstrap.configured) {
          res.status(503).json({
            error:
              "No admin account exists yet. Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in Railway, redeploy, then sign in.",
          });
          return;
        }

        try {
          await logAdminAction(email, "LOGIN_FAILED", { reason: "unknown_email" }, req);
        } catch (auditError) {
          console.error("[admin/auth/login] audit log failed:", auditError);
        }
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const validPassword = await verifyAdminPassword(body.password, admin.passwordHash);
      if (!validPassword) {
        try {
          await logAdminAction(email, "LOGIN_FAILED", { reason: "invalid_password" }, req, admin.id);
        } catch (auditError) {
          console.error("[admin/auth/login] audit log failed:", auditError);
        }
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const session = await createAdminSessionRecord(admin.id, {
        pending2FA: admin.twoFactorEnabled,
        req,
      });

      attachSessionCookie(res, session.token, session.expiresAt);

      try {
        if (admin.twoFactorEnabled) {
          await logAdminAction(email, "LOGIN_PASSWORD_OK_2FA_PENDING", {}, req, admin.id);
        } else {
          await logAdminAction(email, "LOGIN_SUCCESS", {}, req, admin.id);
        }
      } catch (auditError) {
        console.error("[admin/auth/login] audit log failed:", auditError);
      }

      res.json({
        ok: true,
        requires2FA: admin.twoFactorEnabled,
        email: admin.email,
        role: admin.role,
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
        return;
      }
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      if (isMissingAdminTables(e)) {
        res.status(503).json({
          error:
            "Admin database tables are missing. Ensure Railway runs pnpm db:push on deploy, then try again.",
        });
        return;
      }
      console.error("[admin/auth/login]", e);
      res.status(500).json({ error: "Login failed" });
    }
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await getSessionFromRequest(req);
      if (ctx) {
        await destroySessionByToken(ctx.token);
        await logAdminAction(ctx.admin.email, "LOGOUT", {}, req, ctx.admin.id);
      }
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Logout failed" });
    }
  })
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    try {
      await bootstrapAdminFromEnv();
      const ctx = await getSessionFromRequest(req);
      if (!ctx) {
        res.status(401).json({ authorized: false });
        return;
      }

      if (ctx.session.pending2FA) {
        res.json({
          authorized: false,
          requires2FA: true,
          email: ctx.admin.email,
        });
        return;
      }

      res.json({
        authorized: true,
        email: ctx.admin.email,
        role: ctx.admin.role,
        permissions: getRolePermissions(ctx.admin.role),
        csrfToken: ctx.csrfToken,
        twoFactorEnabled: ctx.admin.twoFactorEnabled,
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed" });
    }
  })
);

router.post(
  "/verify-2fa",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requirePending2FASession(req);
      const { code } = z.object({ code: z.string().min(6).max(16) }).parse(req.body);
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
        await logAdminAction(admin.email, "LOGIN_2FA_FAILED", {}, req, admin.id);
        res.status(401).json({ error: "Invalid authentication code" });
        return;
      }

      const expiresAt = await completePending2FASession(ctx.session.id);
      await logAdminAction(
        admin.email,
        usedBackup ? "LOGIN_SUCCESS_BACKUP_CODE" : "LOGIN_SUCCESS_2FA",
        { usedBackup },
        req,
        admin.id
      );

      attachSessionCookie(res, ctx.token, expiresAt);
      res.json({
        ok: true,
        email: admin.email,
        role: admin.role,
        csrfToken: ctx.csrfToken,
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Enter a valid 6-digit code" });
        return;
      }
      handleAdminError(res, e, "Verification failed");
    }
  })
);

router.post(
  "/2fa/setup",
  asyncHandler(async (req, res) => {
    try {
      const { admin } = await requireAdminSession(req);
      if (admin.twoFactorEnabled) {
        res.status(400).json({ error: "Two-factor authentication is already enabled" });
        return;
      }

      const secret = generateTotpSecret();
      await prisma.admin.update({
        where: { id: admin.id },
        data: { twoFactorSecret: secret, twoFactorEnabled: false },
      });

      const qrDataUrl = await buildTotpQrDataUrl(admin.email, secret);
      res.json({
        secret,
        qrDataUrl,
        message: "Scan the QR code, then confirm with a code to enable 2FA.",
      });
    } catch (e) {
      handleAdminError(res, e, "Failed to start 2FA setup");
    }
  })
);

router.post(
  "/2fa/enable",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requireAdminSessionWithCsrf(req);
      const { code } = z.object({ code: z.string().min(6).max(8) }).parse(req.body);

      if (!ctx.admin.twoFactorSecret) {
        res.status(400).json({ error: "Run 2FA setup first" });
        return;
      }

      if (!verifyTotpCode(ctx.admin.twoFactorSecret, code)) {
        res.status(401).json({ error: "Invalid authentication code" });
        return;
      }

      const backupCodes = generateBackupCodes();
      await prisma.admin.update({
        where: { id: ctx.admin.id },
        data: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: hashBackupCodes(backupCodes),
        },
      });

      await logAdminAction(ctx.admin.email, "2FA_ENABLED", {}, req, ctx.admin.id);
      res.json({
        ok: true,
        backupCodes,
        message: "Save these backup codes in a secure place. They will not be shown again.",
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Enter a valid 6-digit code" });
        return;
      }
      handleAdminError(res, e, "Failed to enable 2FA");
    }
  })
);

router.post(
  "/2fa/disable",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requireAdminSessionWithCsrf(req);
      const body = z
        .object({
          password: z.string().min(1),
          code: z.string().min(6).max(16),
        })
        .parse(req.body);

      const validPassword = await verifyAdminPassword(body.password, ctx.admin.passwordHash);
      if (!validPassword) {
        res.status(401).json({ error: "Invalid password" });
        return;
      }

      if (
        ctx.admin.twoFactorEnabled &&
        ctx.admin.twoFactorSecret &&
        !verifyTotpCode(ctx.admin.twoFactorSecret, body.code)
      ) {
        res.status(401).json({ error: "Invalid authentication code" });
        return;
      }

      await prisma.admin.update({
        where: { id: ctx.admin.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: [],
        },
      });

      await logAdminAction(ctx.admin.email, "2FA_DISABLED", {}, req, ctx.admin.id);
      res.json({ ok: true });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input" });
        return;
      }
      handleAdminError(res, e, "Failed to disable 2FA");
    }
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    try {
      const { email: rawEmail } = z.object({ email: adminEmailSchema }).parse(req.body);
      const email = normalizeAdminEmail(rawEmail);
      const admin = await prisma.admin.findUnique({ where: { email } });

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

        await logAdminAction(email, "PASSWORD_RESET_REQUESTED", {}, req, admin.id);

        if (process.env.NODE_ENV !== "production") {
          console.info(`[admin] Password reset token for ${email}: ${token}`);
        }
      }

      res.json({
        ok: true,
        message: "If an account exists for that email, reset instructions have been sent.",
        ...(process.env.NODE_ENV !== "production" && admin
          ? { devResetToken: "Check server logs for reset token in development" }
          : {}),
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.errors[0]?.message ?? "Invalid email" });
        return;
      }
      console.error("[admin/auth/forgot-password]", e);
      res.status(500).json({ error: "Request failed" });
    }
  })
);

router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requireAdminSessionWithCsrf(req);
      const body = z
        .object({
          currentPassword: z.string().min(1),
          newPassword: adminPasswordSchema,
          code: z.string().optional(),
        })
        .parse(req.body);

      const validPassword = await verifyAdminPassword(body.currentPassword, ctx.admin.passwordHash);
      if (!validPassword) {
        await logAdminAction(
          ctx.admin.email,
          "PASSWORD_CHANGE_FAILED",
          { reason: "bad_password" },
          req,
          ctx.admin.id
        );
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      if (ctx.admin.twoFactorEnabled) {
        if (
          !body.code ||
          !ctx.admin.twoFactorSecret ||
          !verifyTotpCode(ctx.admin.twoFactorSecret, body.code)
        ) {
          res.status(401).json({ error: "Valid 2FA code required" });
          return;
        }
      }

      const passwordHash = await hashAdminPassword(body.newPassword);
      await prisma.admin.update({
        where: { id: ctx.admin.id },
        data: { passwordHash },
      });

      await destroyAllAdminSessions(ctx.admin.id);
      await logAdminAction(ctx.admin.email, "PASSWORD_CHANGED", {}, req, ctx.admin.id);
      clearSessionCookie(res);

      res.json({
        ok: true,
        message: "Password updated. Please sign in again.",
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
        return;
      }
      handleAdminError(res, e, "Password change failed");
    }
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    try {
      const body = z
        .object({
          token: z.string().min(32),
          newPassword: adminPasswordSchema,
        })
        .parse(req.body);

      const tokenHash = hashResetToken(body.token);
      const admin = await prisma.admin.findFirst({
        where: {
          passwordResetToken: tokenHash,
          passwordResetExpires: { gt: new Date() },
        },
      });

      if (!admin) {
        res.status(400).json({ error: "Invalid or expired reset token" });
        return;
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
      await logAdminAction(admin.email, "PASSWORD_RESET_COMPLETED", {}, req, admin.id);

      res.json({ ok: true, message: "Password reset successful. Please sign in." });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
        return;
      }
      console.error("[admin/auth/reset-password]", e);
      res.status(500).json({ error: "Reset failed" });
    }
  })
);

export default router;

