import { createHash, randomBytes } from "crypto";
import type { Request, Response } from "express";
import type { Admin, AdminRole, AdminSession } from "@iopn/database";
import prisma from "../prisma";

export const ADMIN_SESSION_COOKIE = "admin_session";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PENDING_2FA_TTL_MS = 5 * 60 * 1000;

export type AdminSessionContext = {
  admin: Admin;
  session: AdminSession;
  csrfToken: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

export function getClientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.trim() ?? null;
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") return realIp;
  return null;
}

function cookieOptions(expires: Date) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createAdminSessionRecord(
  adminId: string,
  options: { pending2FA?: boolean; req?: Request } = {}
): Promise<{ token: string; csrfToken: string; expiresAt: Date }> {
  const token = generateSecureToken();
  const csrfToken = generateSecureToken();
  const ttl = options.pending2FA ? PENDING_2FA_TTL_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await prisma.adminSession.create({
    data: {
      adminId,
      tokenHash: hashToken(token),
      csrfToken,
      pending2FA: options.pending2FA ?? false,
      expiresAt,
      ipAddress: getClientIp(options.req),
      userAgent: options.req?.headers["user-agent"] ?? null,
    },
  });

  if (!options.pending2FA) {
    await prisma.admin.update({
      where: { id: adminId },
      data: { lastLogin: new Date() },
    });
  }

  return { token, csrfToken, expiresAt };
}

export function attachSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(ADMIN_SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response): void {
  res.cookie(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function destroySessionByToken(token: string): Promise<void> {
  await prisma.adminSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function destroyAllAdminSessions(adminId: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { adminId } });
}

export async function getSessionFromRequest(
  req: Request
): Promise<(AdminSessionContext & { token: string }) | null> {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (!token || typeof token !== "string") return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return {
    token,
    admin: session.admin,
    session,
    csrfToken: session.csrfToken,
  };
}

export async function completePending2FASession(sessionId: string): Promise<Date> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await prisma.adminSession.update({
    where: { id: sessionId },
    data: { pending2FA: false, expiresAt },
    include: { admin: true },
  });

  await prisma.admin.update({
    where: { id: session.adminId },
    data: { lastLogin: new Date() },
  });

  return expiresAt;
}

export function validateCsrf(req: Request, session: AdminSession): boolean {
  const header = req.headers["x-csrf-token"];
  return Boolean(header && typeof header === "string" && header === session.csrfToken);
}

export type { AdminRole };
