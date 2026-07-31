import { Router } from "express";
import { z } from "zod";
import { AdminAuthError } from "../../lib/admin-auth";
import prisma from "../../lib/prisma";
import { asyncHandler, getRouteParam, queryToSearchParams } from "../../lib/http-helpers";
import {
  requireAdminSession,
  requirePermission,
} from "../../lib/admin/express-api-auth";
import { logAdminAction } from "../../lib/admin/express-audit";
import {
  adminProjectProfilePatchSchema,
  buildProfileUpdateData,
  collectProfileAuditEntries,
  rejectImmutableFields,
  validateNoDuplicateLinks,
} from "../../lib/project-profile";

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

router.get(
  "/:id/profile/history",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "discovery", "GET");
      const id = getRouteParam(req.params.id);
      const limit = Math.min(Number(queryToSearchParams(req.query).get("limit") ?? 50), 100);
      const history = await prisma.metadataUpdate.findMany({
        where: { tokenId: id },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      res.json({
        history: history.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load profile history" });
    }
  })
);

router.patch(
  "/:id/profile",
  asyncHandler(async (req, res) => {
    try {
      const id = getRouteParam(req.params.id);
      const ctx = await requirePermission(req, "discovery", "PATCH");
      rejectImmutableFields(ctx.parsedBody as Record<string, unknown>);
      const body = adminProjectProfilePatchSchema.parse(ctx.parsedBody);
      validateNoDuplicateLinks(body);

      const existing = await prisma.tokenProject.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Token not found" });
        return;
      }

      const updateData = buildProfileUpdateData({
        ...body,
        walletAddress: existing.creatorAddress,
        message: "admin",
        signature: "0x0",
      });

      const editorWallet = `admin:${ctx.email}`;

      const updated = await prisma.$transaction(async (tx) => {
        const before = await tx.tokenProject.findUniqueOrThrow({ where: { id } });
        const after = await tx.tokenProject.update({ where: { id }, data: updateData });
        const auditEntries = collectProfileAuditEntries(before, after, body);
        if (auditEntries.length > 0) {
          await tx.metadataUpdate.createMany({
            data: auditEntries.map((entry) => ({
              tokenId: id,
              field: entry.field,
              editorWallet,
              oldValue: entry.oldValue,
              newValue: entry.newValue,
            })),
          });
        }
        return after;
      });

      await logAdminAction(
        ctx.email,
        "TOKEN_PROFILE_UPDATE",
        { tokenId: id, fields: Object.keys(body) },
        req,
        ctx.admin.id
      );

      res.json({
        token: {
          ...updated,
          featureFlags: updated.featureFlags.toString(),
          profileUpdatedAt: updated.profileUpdatedAt?.toISOString() ?? null,
        },
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
      if (e instanceof Error && (e.message.includes("immutable") || e.message.includes("Duplicate link"))) {
        res.status(400).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Profile update failed" });
    }
  })
);

export default router;


