import { Router } from "express";
import { z } from "zod";
import { isAddress } from "viem";
import { asyncHandler, getRouteParam } from "../lib/http-helpers";
import { authRateLimit, publicRateLimit } from "../middleware/rateLimit";
import prisma from "../lib/prisma";
import { getVerificationStatus } from "../lib/verification/verification-engine";
import {
  generateAndStoreOtp,
  sendOtpEmail,
  verifyOtp,
} from "../lib/verification/email-service";
import {
  decodeOAuthState,
  encryptToken,
  exchangeDiscordCode,
  exchangeXCode,
  getDiscordAuthUrl,
  getXAuthUrl,
  profileRedirect,
} from "../lib/verification/oauth-service";

const router = Router();

const walletSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const sendOtpSchema = z.object({
  walletAddress: walletSchema,
  email: z.string().email(),
});

const confirmOtpSchema = z.object({
  walletAddress: walletSchema,
  otp: z.string().regex(/^\d{6}$/),
});

const walletBodySchema = z.object({
  walletAddress: walletSchema,
});

router.use(publicRateLimit);

router.get(
  "/status/:address",
  asyncHandler(async (req, res) => {
    const address = getRouteParam(req.params.address).toLowerCase();
    if (!isAddress(address)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }
    const status = await getVerificationStatus(address);
    res.json(status);
  })
);

router.post(
  "/email/send-otp",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { walletAddress, email } = sendOtpSchema.parse(req.body);
    try {
      const otp = await generateAndStoreOtp(walletAddress, email);
      await sendOtpEmail(email.trim().toLowerCase(), otp);
      res.json({
        success: true,
        ...(process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY
          ? { devCode: otp }
          : {}),
      });
    } catch (e) {
      console.error("[verification/send-otp]", e);
      res.status(500).json({ error: "Failed to send code" });
    }
  })
);

router.post(
  "/email/confirm-otp",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { walletAddress, otp } = confirmOtpSchema.parse(req.body);
    const result = await verifyOtp(walletAddress, otp);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const status = await getVerificationStatus(walletAddress);
    res.json({ success: true, status });
  })
);

router.post(
  "/neoid/confirm",
  asyncHandler(async (req, res) => {
    const { walletAddress } = walletBodySchema.parse(req.body);
    const wallet = walletAddress.toLowerCase();

    // STUB — replace with on-chain NeoID verification when live
    await prisma.walletVerification.upsert({
      where: { walletAddress: wallet },
      create: {
        walletAddress: wallet,
        neoIdVerified: true,
        neoIdVerifiedAt: new Date(),
      },
      update: {
        neoIdVerified: true,
        neoIdVerifiedAt: new Date(),
      },
    });

    const status = await getVerificationStatus(wallet);
    res.json({ success: true, status });
  })
);

router.get(
  "/social/x/connect",
  asyncHandler(async (req, res) => {
    const wallet = String(req.query.wallet ?? "").toLowerCase();
    if (!isAddress(wallet)) {
      res.status(400).json({ error: "Missing wallet" });
      return;
    }
    try {
      res.redirect(getXAuthUrl(wallet));
    } catch (e) {
      res.status(503).json({ error: e instanceof Error ? e.message : "X OAuth unavailable" });
    }
  })
);

router.get(
  "/social/x/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    if (!code || !state) {
      res.redirect(profileRedirect("error=x_oauth_failed"));
      return;
    }
    try {
      const { walletAddress } = decodeOAuthState(state);
      const { accessToken, userId, username } = await exchangeXCode(code);
      await prisma.walletVerification.upsert({
        where: { walletAddress },
        create: {
          walletAddress,
          xConnected: true,
          xUserId: userId,
          xUsername: username,
          xAccessToken: encryptToken(accessToken),
          xConnectedAt: new Date(),
        },
        update: {
          xConnected: true,
          xUserId: userId,
          xUsername: username,
          xAccessToken: encryptToken(accessToken),
          xConnectedAt: new Date(),
        },
      });
      res.redirect(profileRedirect("social=x_connected"));
    } catch (e) {
      console.error("[verification/x/callback]", e);
      res.redirect(profileRedirect("error=x_oauth_failed"));
    }
  })
);

router.post(
  "/social/x/disconnect",
  asyncHandler(async (req, res) => {
    const { walletAddress } = walletBodySchema.parse(req.body);
    const wallet = walletAddress.toLowerCase();
    await prisma.walletVerification.updateMany({
      where: { walletAddress: wallet },
      data: {
        xConnected: false,
        xUserId: null,
        xUsername: null,
        xAccessToken: null,
        xConnectedAt: null,
      },
    });
    res.json({ success: true });
  })
);

router.get(
  "/social/discord/connect",
  asyncHandler(async (req, res) => {
    const wallet = String(req.query.wallet ?? "").toLowerCase();
    if (!isAddress(wallet)) {
      res.status(400).json({ error: "Missing wallet" });
      return;
    }
    try {
      res.redirect(getDiscordAuthUrl(wallet));
    } catch (e) {
      res.status(503).json({ error: e instanceof Error ? e.message : "Discord OAuth unavailable" });
    }
  })
);

router.get(
  "/social/discord/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    if (!code || !state) {
      res.redirect(profileRedirect("error=discord_oauth_failed"));
      return;
    }
    try {
      const { walletAddress } = decodeOAuthState(state);
      const { accessToken, userId, username } = await exchangeDiscordCode(code);
      await prisma.walletVerification.upsert({
        where: { walletAddress },
        create: {
          walletAddress,
          discordConnected: true,
          discordUserId: userId,
          discordUsername: username,
          discordAccessToken: encryptToken(accessToken),
          discordConnectedAt: new Date(),
        },
        update: {
          discordConnected: true,
          discordUserId: userId,
          discordUsername: username,
          discordAccessToken: encryptToken(accessToken),
          discordConnectedAt: new Date(),
        },
      });
      res.redirect(profileRedirect("social=discord_connected"));
    } catch (e) {
      console.error("[verification/discord/callback]", e);
      res.redirect(profileRedirect("error=discord_oauth_failed"));
    }
  })
);

router.post(
  "/social/discord/disconnect",
  asyncHandler(async (req, res) => {
    const { walletAddress } = walletBodySchema.parse(req.body);
    const wallet = walletAddress.toLowerCase();
    await prisma.walletVerification.updateMany({
      where: { walletAddress: wallet },
      data: {
        discordConnected: false,
        discordUserId: null,
        discordUsername: null,
        discordAccessToken: null,
        discordConnectedAt: null,
      },
    });
    res.json({ success: true });
  })
);

export default router;
