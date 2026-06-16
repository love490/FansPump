import { randomBytes } from "crypto";
import type { Response } from "express";
import type { AppAccount, AppSession } from "@iopn/database";
import prisma from "../prisma";

export const APP_SESSION_COOKIE = "app_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AppSessionContext = {
  account: AppAccount;
  session: AppSession;
};

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function attachAppSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(APP_SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function clearAppSessionCookie(res: Response): void {
  res.cookie(APP_SESSION_COOKIE, "", {
    ...cookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function createAppSession(accountId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.appSession.create({
    data: { accountId, token, expiresAt },
  });

  return { token, expiresAt };
}

export async function destroyAppSessionByToken(token: string): Promise<void> {
  await prisma.appSession.deleteMany({ where: { token } });
}

export async function getAppSessionFromRequest(
  cookies: Record<string, string | undefined> | undefined
): Promise<AppSessionContext | null> {
  const token = cookies?.[APP_SESSION_COOKIE];
  if (!token) return null;

  const session = await prisma.appSession.findUnique({
    where: { token },
    include: { account: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.appSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return { account: session.account, session };
}

export function serializeAppAccount(account: AppAccount) {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    walletAddress: account.walletAddress,
  };
}
