import { Router } from "express";
import { z } from "zod";
import { AdminAuthError } from "../../lib/admin-auth";
import { roleHasPermission } from "../../lib/admin/roles";
import { serializeLaunchpool } from "../../lib/launchpool/serialize";
import { getLaunchpoolStakeStats, distributeLaunchpoolRewards } from "../../lib/launchpool/rewards";
import prisma from "../../lib/prisma";
import { asyncHandler, getRouteParam } from "../../lib/http-helpers";
import {
  requireAdminSessionWithCsrf,
  requirePermission,
} from "../../lib/admin/express-api-auth";
import { handleAdminError } from "../../lib/admin/handle-error";

const stakeAssetSchema = z.object({
  assetType: z.string().min(1),
  assetSymbol: z.string().min(1),
  assetAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
});

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  detailInfo: z.string().min(10).max(8000),
  status: z.enum(["ACTIVE", "ONGOING", "ENDED"]),
  rewardTokenSymbol: z.string().min(1).max(16),
  rewardTokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
  totalRewardUsd: z.number().positive(),
  totalRewardAmount: z.string().regex(/^\d+$/),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  durationLabel: z.string().max(64).optional().nullable(),
  isPublished: z.boolean().optional(),
  stakeAssets: z.array(stakeAssetSchema).min(1),
});

const updateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(2000).optional(),
  detailInfo: z.string().min(10).max(8000).optional(),
  status: z.enum(["ACTIVE", "ONGOING", "ENDED"]).optional(),
  rewardTokenSymbol: z.string().min(1).max(16).optional(),
  rewardTokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
  totalRewardUsd: z.number().positive().optional(),
  totalRewardAmount: z.string().regex(/^\d+$/).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  durationLabel: z.string().max(64).optional().nullable(),
  isPublished: z.boolean().optional(),
  stakeAssets: z.array(stakeAssetSchema).min(1).optional(),
});

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "launchpool", "GET");

      const pools = await prisma.launchpool.findMany({
        include: { stakeAssets: true },
        orderBy: { createdAt: "desc" },
      });

      const serialized = await Promise.all(
        pools.map(async (pool) => {
          const stats = await getLaunchpoolStakeStats(pool.id);
          return serializeLaunchpool(pool, stats);
        })
      );

      res.json({ pools: serialized });
    } catch (e) {
      handleAdminError(res, e, "Admin request failed");
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const { parsedBody } = await requirePermission(req, "launchpool", "POST");
      const body = createSchema.parse(parsedBody);

      const pool = await prisma.launchpool.create({
        data: {
          title: body.title,
          description: body.description,
          detailInfo: body.detailInfo,
          status: body.status,
          rewardTokenSymbol: body.rewardTokenSymbol.toUpperCase(),
          rewardTokenAddress: body.rewardTokenAddress?.toLowerCase() ?? null,
          totalRewardUsd: body.totalRewardUsd,
          totalRewardAmount: body.totalRewardAmount,
          startAt: new Date(body.startAt),
          endAt: new Date(body.endAt),
          durationLabel: body.durationLabel ?? null,
          isPublished: body.isPublished ?? true,
          stakeAssets: {
            create: body.stakeAssets.map((asset) => ({
              assetType: asset.assetType.toUpperCase(),
              assetSymbol: asset.assetSymbol.toUpperCase(),
              assetAddress: asset.assetAddress?.toLowerCase() ?? null,
            })),
          },
        },
        include: { stakeAssets: true },
      });

      res.json({
        pool: serializeLaunchpool(pool, { totalStakedAmount: "0", participantCount: 0 }),
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      handleAdminError(res, e, "Admin request failed");
    }
  })
);

router.post(
  "/:id/distribute",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const { admin } = await requireAdminSessionWithCsrf(req);
      if (!roleHasPermission(admin.role, "launchpool")) {
        throw new AdminAuthError("Insufficient permissions");
      }
      const result = await distributeLaunchpoolRewards(id);
      res.json(result);
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      const message = e instanceof Error ? e.message : "Distribution failed";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
        return;
      }
      if (message.includes("already distributed")) {
        res.status(409).json({ error: message });
        return;
      }
      console.error(e);
      res.status(500).json({ error: "Distribution failed" });
    }
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const { parsedBody } = await requirePermission(req, "launchpool", "PATCH");
      const body = updateSchema.parse(parsedBody);

      const existing = await prisma.launchpool.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Launchpool not found" });
        return;
      }

      if (body.stakeAssets) {
        await prisma.launchpoolStakeAsset.deleteMany({ where: { launchpoolId: id } });
      }

      const pool = await prisma.launchpool.update({
        where: { id },
        data: {
          title: body.title,
          description: body.description,
          detailInfo: body.detailInfo,
          status: body.status,
          rewardTokenSymbol: body.rewardTokenSymbol?.toUpperCase(),
          rewardTokenAddress: body.rewardTokenAddress?.toLowerCase(),
          totalRewardUsd: body.totalRewardUsd,
          totalRewardAmount: body.totalRewardAmount,
          startAt: body.startAt ? new Date(body.startAt) : undefined,
          endAt: body.endAt ? new Date(body.endAt) : undefined,
          durationLabel: body.durationLabel,
          isPublished: body.isPublished,
          ...(body.stakeAssets
            ? {
                stakeAssets: {
                  create: body.stakeAssets.map((asset) => ({
                    assetType: asset.assetType.toUpperCase(),
                    assetSymbol: asset.assetSymbol.toUpperCase(),
                    assetAddress: asset.assetAddress?.toLowerCase() ?? null,
                  })),
                },
              }
            : {}),
        },
        include: { stakeAssets: true },
      });

      const stats = await getLaunchpoolStakeStats(pool.id);
      res.json({ pool: serializeLaunchpool(pool, stats) });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      handleAdminError(res, e, "Admin request failed");
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const { admin } = await requireAdminSessionWithCsrf(req);
      if (!roleHasPermission(admin.role, "launchpool")) {
        throw new AdminAuthError("Insufficient permissions");
      }

      await prisma.launchpool.delete({ where: { id } });
      res.json({ ok: true });
    } catch (e) {
      handleAdminError(res, e, "Admin request failed");
    }
  })
);

export default router;

