import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import type { Admin, AdminRole, AdminSession } from "@iopn/database";

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

export function getClientIp(request?: NextRequest): string | null {
  return (
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request?.headers.get("x-real-ip") ??
    null
  );
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
  options: { pending2FA?: boolean; request?: NextRequest } = {}
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
      ipAddress: getClientIp(options.request),
      userAgent: options.request?.headers.get("user-agent") ?? null,
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

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): NextResponse {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, cookieOptions(expiresAt));
  return response;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
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
  request?: NextRequest
): Promise<(AdminSessionContext & { token: string }) | null> {
  const token =
    request?.cookies.get(ADMIN_SESSION_COOKIE)?.value ??
    (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) return null;

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

export async function refreshSessionCookieExpiry(
  response: NextResponse,
  token: string,
  expiresAt: Date
): Promise<void> {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function validateCsrf(request: NextRequest, session: AdminSession): boolean {
  const header = request.headers.get("x-csrf-token");
  return Boolean(header && header === session.csrfToken);
}

export type { AdminRole };
