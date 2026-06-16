import { Router } from "express";
import prisma from "../lib/prisma";
import { asyncHandler, queryToSearchParams } from "../lib/http-helpers";
import { notImplemented } from "../lib/route-utils";
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

router.post("/", notImplemented);

export default router;

