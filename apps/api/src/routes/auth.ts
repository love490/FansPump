import { Router } from "express";
import { z } from "zod";
import { randomInt } from "crypto";
import { isAddress } from "viem";
import { asyncHandler } from "../lib/http-helpers";
import { authRateLimit } from "../middleware/rateLimit";
import prisma from "../lib/prisma";
import {
  attachAppSessionCookie,
  clearAppSessionCookie,
  createAppSession,
  destroyAppSessionByToken,
  getAppSessionFromRequest,
  serializeAppAccount,
  APP_SESSION_COOKIE,
} from "../lib/auth/session";
import {
  buildOAuthAuthorizeUrl,
  createOAuthState,
  createPkce,
  exchangeOAuthCode,
  isOAuthConfigured,
  isOAuthProvider,
  oauthErrorRedirect,
  oauthProviderLabel,
  oauthSuccessRedirect,
  type OAuthProvider,
} from "../lib/auth/oauth";
import {
  findOrCreateAccountFromEmail,
  findOrCreateAccountFromOAuth,
  linkWalletToAccount,
} from "../lib/auth/accounts";

const router = Router();

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_PKCE_COOKIE = "oauth_pkce";

const emailSendSchema = z.object({
  email: z.string().email(),
});

const emailVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

const linkWalletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

function oauthStateCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeMs,
  };
}

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const session = await getAppSessionFromRequest(req.cookies);
    if (!session) {
      res.json({ signedIn: false });
      return;
    }

    res.json({
      signedIn: true,
      account: serializeAppAccount(session.account),
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[APP_SESSION_COOKIE];
    if (token) {
      await destroyAppSessionByToken(token);
    }
    clearAppSessionCookie(res);
    res.json({ ok: true });
  })
);

router.post(
  "/email/send",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email } = emailSendSchema.parse(req.body);
    const normalized = email.trim().toLowerCase();
    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailOtp.deleteMany({ where: { email: normalized } });
    await prisma.emailOtp.create({
      data: { email: normalized, code, expiresAt },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[auth/email] OTP for ${normalized}: ${code}`);
    }

    // TODO: integrate transactional email provider in production
    res.json({
      ok: true,
      message: "Verification code sent",
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
  })
);

router.post(
  "/email/verify",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email, code } = emailVerifySchema.parse(req.body);
    const normalized = email.trim().toLowerCase();

    const otp = await prisma.emailOtp.findFirst({
      where: { email: normalized, code },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.expiresAt < new Date()) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    await prisma.emailOtp.deleteMany({ where: { email: normalized } });

    const account = await findOrCreateAccountFromEmail(normalized);
    const { token, expiresAt } = await createAppSession(account.id);
    attachAppSessionCookie(res, token, expiresAt);

    res.json({
      ok: true,
      account: serializeAppAccount(account),
    });
  })
);

router.get(
  "/oauth/:provider",
  asyncHandler(async (req, res) => {
    const provider = String(req.params.provider);
    if (!isOAuthProvider(provider)) {
      res.status(400).json({ error: "Unknown provider" });
      return;
    }

    if (!isOAuthConfigured(provider)) {
      res.status(503).json({
        error: `${oauthProviderLabel(provider)} sign-in is not configured yet`,
      });
      return;
    }

    const state = createOAuthState();
    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions(10 * 60 * 1000));

    let authorizeUrl: string;
    if (provider === "twitter") {
      const { verifier, challenge } = createPkce();
      res.cookie(OAUTH_PKCE_COOKIE, verifier, oauthStateCookieOptions(10 * 60 * 1000));
      authorizeUrl = buildOAuthAuthorizeUrl(provider, state, challenge);
    } else {
      authorizeUrl = buildOAuthAuthorizeUrl(provider, state);
    }

    res.redirect(authorizeUrl);
  })
);

async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string,
  state: string | undefined,
  req: import("express").Request,
  res: import("express").Response
) {
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  if (!expectedState || !state || expectedState !== state) {
    res.redirect(oauthErrorRedirect("Invalid OAuth state"));
    return;
  }

  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  try {
    const pkceVerifier = provider === "twitter" ? req.cookies?.[OAUTH_PKCE_COOKIE] : undefined;
    if (provider === "twitter") {
      res.clearCookie(OAUTH_PKCE_COOKIE, { path: "/" });
    }

    const profile = await exchangeOAuthCode(provider, code, pkceVerifier);
    if (!profile.providerUserId) {
      res.redirect(oauthErrorRedirect("Could not read provider profile"));
      return;
    }

    const account = await findOrCreateAccountFromOAuth(provider, profile);
    const { token, expiresAt } = await createAppSession(account.id);
    attachAppSessionCookie(res, token, expiresAt);
    res.redirect(oauthSuccessRedirect());
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    res.redirect(oauthErrorRedirect(message));
  }
}

router.get(
  "/oauth/:provider/callback",
  asyncHandler(async (req, res) => {
    const provider = String(req.params.provider);
    if (!isOAuthProvider(provider)) {
      res.status(400).json({ error: "Unknown provider" });
      return;
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code) {
      res.redirect(oauthErrorRedirect("Missing authorization code"));
      return;
    }

    await handleOAuthCallback(provider, code, state, req, res);
  })
);

router.post(
  "/oauth/apple/callback",
  asyncHandler(async (req, res) => {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const state = typeof req.body?.state === "string" ? req.body.state : undefined;
    if (!code) {
      res.redirect(oauthErrorRedirect("Missing authorization code"));
      return;
    }

    await handleOAuthCallback("apple", code, state, req, res);
  })
);

router.post(
  "/link-wallet",
  asyncHandler(async (req, res) => {
    const session = await getAppSessionFromRequest(req.cookies);
    if (!session) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }

    const { walletAddress } = linkWalletSchema.parse(req.body);
    if (!isAddress(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    try {
      const account = await linkWalletToAccount(session.account.id, walletAddress);
      res.json({ ok: true, account: serializeAppAccount(account) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to link wallet";
      res.status(409).json({ error: message });
    }
  })
);

router.get(
  "/providers",
  asyncHandler(async (_req, res) => {
    const providers: OAuthProvider[] = ["google", "github", "twitter", "apple", "discord"];
    res.json({
      oauth: Object.fromEntries(
        providers.map((p) => [p, isOAuthConfigured(p)])
      ),
      email: true,
      wallet: true,
    });
  })
);

export default router;

