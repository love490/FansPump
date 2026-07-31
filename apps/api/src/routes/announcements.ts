import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { CreatorAuthError, requireCreatorActionAuth } from "../lib/creator-auth";
import { announcementCreateSchema } from "../lib/project-profile";
import { asyncHandler, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const tokenAddress = searchParams.get("tokenAddress")?.toLowerCase();
    const creatorWallet = searchParams.get("creatorWallet")?.toLowerCase();
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const where: Record<string, unknown> = { isHidden: false };
    if (tokenAddress) where.tokenAddress = tokenAddress;
    if (creatorWallet) where.creatorWallet = creatorWallet;

    try {
      const announcements = await prisma.tokenAnnouncement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      res.json({
        announcements: announcements.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (e) {
      console.error("[GET /api/announcements]", e);
      res.status(500).json({ error: "Failed to load announcements" });
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const parsed = announcementCreateSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(parsed);
      const tokenAddress = parsed.tokenAddress.toLowerCase();

      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: tokenAddress },
      });
      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }
      if (token.creatorAddress.toLowerCase() !== wallet) {
        res.status(403).json({ error: "Not token creator" });
        return;
      }

      const announcement = await prisma.tokenAnnouncement.create({
        data: {
          tokenId: token.id,
          tokenAddress,
          creatorWallet: wallet,
          title: parsed.title.trim(),
          content: parsed.content.trim(),
          type: parsed.type,
          imageUrl: parsed.imageUrl ?? null,
        },
      });

      res.json({
        announcement: {
          ...announcement,
          createdAt: announcement.createdAt.toISOString(),
        },
      });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        const msg = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
        res.status(400).json({ error: msg || "Invalid announcement" });
        return;
      }
      console.error("[POST /api/announcements]", e);
      res.status(500).json({ error: "Failed to post announcement" });
    }
  })
);

export default router;
