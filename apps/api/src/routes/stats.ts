import { Router } from "express";
import { getActiveChainId } from "@/lib/chain-config/opn";
import prisma from "../lib/prisma";
import { asyncHandler, setCacheControl } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    try {
      const chainId = getActiveChainId();

      const [tokenCount, verificationCount, voteCount, creatorGroups, announcementCount] =
        await Promise.all([
          prisma.tokenProject.count({ where: { chainId } }),
          prisma.creatorVerification.count(),
          prisma.tokenVote.count(),
          prisma.tokenProject.groupBy({
            by: ["creatorAddress"],
            where: { chainId },
          }),
          prisma.tokenAnnouncement.count({ where: { isHidden: false } }),
        ]);

      setCacheControl(res, "public, s-maxage=10, stale-while-revalidate=20");
      res.json({
        stats: {
          tokenCount,
          verificationCount,
          verifiedCreatorCount: verificationCount,
          voteCount,
          creatorCount: creatorGroups.length,
          announcementCount,
          chainId,
        },
      });
    } catch (e) {
      console.error("[GET /api/stats]", e);
      const detail = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        error: "Failed to load stats",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      });
    }
  })
);

export default router;
