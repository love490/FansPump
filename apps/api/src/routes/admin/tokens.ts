import { Router } from "express";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import prisma from "../../lib/prisma";
import { asyncHandler, getRouteParam, queryToSearchParams } from "../../lib/http-helpers";
import {
  requireAdminSession,
  requirePermission,
} from "../../lib/admin/express-api-auth";
import { logAdminAction } from "../../lib/admin/express-audit";

const patchSchema = z.object({
  isFeatured: z.boolean().optional(),
  trendingScore: z.number().optional(),
  isHidden: z.boolean().optional(),
  isScam: z.boolean().optional(),
});

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      await requireAdminSession(req);

      const q = queryToSearchParams(req.query).get("q")?.trim();
      const tokens = await prisma.tokenProject.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { symbol: { contains: q, mode: "insensitive" } },
                { contractAddress: { contains: q.toLowerCase() } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          creator: { include: { verification: true } },
        },
      });

      res.json({
        tokens: tokens.map((t) => ({
          ...t,
          featureFlags: t.featureFlags.toString(),
          creatorVerified: !!t.creator?.verification,
        })),
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load tokens" });
    }
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const id = getRouteParam(req.params.id);
      const ctx = await requirePermission(req, "discovery", "PATCH");
      const body = patchSchema.parse(ctx.parsedBody);

      const data: {
        isFeatured?: boolean;
        trendingScore?: number;
        isHidden?: boolean;
        isScam?: boolean;
      } = {};
      if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
      if (body.trendingScore !== undefined) data.trendingScore = body.trendingScore;
      if (body.isHidden !== undefined) data.isHidden = body.isHidden;
      if (body.isScam !== undefined) data.isScam = body.isScam;

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: "No updates provided" });
        return;
      }

      const token = await prisma.tokenProject.update({
        where: { id },
        data,
      });

      await logAdminAction(
        ctx.email,
        "TOKEN_MODERATION",
        { tokenId: id, ...data },
        req,
        ctx.admin.id
      );

      res.json({
        token: { ...token, featureFlags: token.featureFlags.toString() },
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      res.status(500).json({ error: "Update failed" });
    }
  })
);

export default router;

