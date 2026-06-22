import { Router } from "express";
import type { LaunchpoolStatus } from "@iopn/database";
import { z } from "zod";
import { serializeLaunchpool, LAUNCHPOOL_STAKE_PREFIX, LAUNCHPOOL_UNSTAKE_PREFIX } from "@/lib/launchpool/serialize";
import { getLaunchpoolStakeStats } from "@/lib/launchpool/rewards";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const stakeSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  assetType: z.string().min(1).max(32),
  assetSymbol: z.string().min(1).max(32),
  assetAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable(),
  amount: z.string().regex(/^\d+$/),
  message: z.string(),
  signature: z.string(),
});

const unstakeSchema = stakeSchema.extend({
  stakeId: z.string().optional(),
});

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const statusParam = queryToSearchParams(req.query).get("status")?.toUpperCase();

    try {
      const statusFilter =
        statusParam === "OPEN" || statusParam === "ONGOING"
          ? { in: ["ACTIVE", "ONGOING"] as LaunchpoolStatus[] }
          : statusParam
            ? { equals: statusParam as LaunchpoolStatus }
            : undefined;

      const pools = await prisma.launchpool.findMany({
        where: {
          isPublished: true,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: { stakeAssets: true },
        orderBy: [{ status: "asc" }, { startAt: "desc" }],
      });

      const serialized = await Promise.all(
        pools.map(async (pool) => {
          const stats = await getLaunchpoolStakeStats(pool.id);
          return serializeLaunchpool(pool, stats);
        })
      );

      res.json({ pools: serialized });
    } catch (e) {
      console.error("[GET /api/launchpool]", e);
      const message =
        e instanceof Error && e.message.includes("column")
          ? "Launchpool database schema is out of date. Redeploy the API service or run db push."
          : "Failed to load launchpools";
      res.status(500).json({ error: message });
    }
  })
);

router.get(
  "/:id/stake",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);
    const wallet = queryToSearchParams(req.query).get("wallet")?.toLowerCase();
    if (!wallet) {
      res.status(400).json({ error: "wallet required" });
      return;
    }

    try {
      const stakes = await prisma.launchpoolStake.findMany({
        where: { launchpoolId: id, walletAddress: wallet, isActive: true },
        orderBy: { stakedAt: "desc" },
      });
      res.json({ stakes });
    } catch (e) {
      console.error("[GET /api/launchpool/[id]/stake]", e);
      res.status(500).json({ error: "Failed to load stakes" });
    }
  })
);

router.post(
  "/:id/stake",
  asyncHandler(async (req, res) => {
    const launchpoolId = getRouteParam(req.params.id);

    try {
      const body = stakeSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth({
        ...body,
        expectedPrefix: LAUNCHPOOL_STAKE_PREFIX,
      });

      const pool = await prisma.launchpool.findFirst({
        where: { id: launchpoolId, isPublished: true, status: { in: ["ACTIVE", "ONGOING"] } },
        include: { stakeAssets: true },
      });

      if (!pool) {
        res.status(404).json({ error: "Launchpool is not open for staking" });
        return;
      }

      const now = new Date();
      if (now < pool.startAt || now > pool.endAt) {
        res.status(403).json({ error: "Launchpool is outside its staking window" });
        return;
      }

      const assetAllowed = pool.stakeAssets.some(
        (asset) =>
          asset.assetSymbol.toUpperCase() === body.assetSymbol.toUpperCase() &&
          (asset.assetAddress?.toLowerCase() ?? null) === (body.assetAddress?.toLowerCase() ?? null)
      );

      if (!assetAllowed) {
        res.status(400).json({ error: "This asset is not supported in this launchpool" });
        return;
      }

      if (BigInt(body.amount) <= 0n) {
        res.status(400).json({ error: "Amount must be greater than zero" });
        return;
      }

      const minStake = BigInt(pool.minStakeAmount || "0");
      const maxStake = pool.maxStakeAmount ? BigInt(pool.maxStakeAmount) : null;

      if (minStake > 0n && BigInt(body.amount) < minStake) {
        res.status(400).json({ error: "Stake amount is below the minimum" });
        return;
      }

      const existing = await prisma.launchpoolStake.findFirst({
        where: {
          launchpoolId,
          walletAddress: wallet,
          assetSymbol: body.assetSymbol,
          assetAddress: body.assetAddress?.toLowerCase() ?? null,
          isActive: true,
        },
      });

      if (existing) {
        const merged = (BigInt(existing.amount) + BigInt(body.amount)).toString();
        if (maxStake !== null && BigInt(merged) > maxStake) {
          res.status(400).json({ error: "Total stake would exceed the maximum" });
          return;
        }
        const stake = await prisma.launchpoolStake.update({
          where: { id: existing.id },
          data: { amount: merged, stakedAt: new Date() },
        });
        res.json({ stake });
        return;
      }

      if (maxStake !== null && BigInt(body.amount) > maxStake) {
        res.status(400).json({ error: "Stake amount exceeds the maximum" });
        return;
      }

      const stake = await prisma.launchpoolStake.create({
        data: {
          launchpoolId,
          walletAddress: wallet,
          assetType: body.assetType,
          assetSymbol: body.assetSymbol.toUpperCase(),
          assetAddress: body.assetAddress?.toLowerCase() ?? null,
          amount: body.amount,
        },
      });

      res.json({ stake });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }
      console.error("[POST /api/launchpool/[id]/stake]", e);
      res.status(500).json({ error: "Stake failed" });
    }
  })
);

router.delete(
  "/:id/stake",
  asyncHandler(async (req, res) => {
    const launchpoolId = getRouteParam(req.params.id);

    try {
      const body = unstakeSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth({
        ...body,
        expectedPrefix: LAUNCHPOOL_UNSTAKE_PREFIX,
      });

      const stake = body.stakeId
        ? await prisma.launchpoolStake.findFirst({
            where: { id: body.stakeId, launchpoolId, walletAddress: wallet, isActive: true },
          })
        : await prisma.launchpoolStake.findFirst({
            where: {
              launchpoolId,
              walletAddress: wallet,
              assetSymbol: body.assetSymbol.toUpperCase(),
              assetAddress: body.assetAddress?.toLowerCase() ?? null,
              isActive: true,
            },
          });

      if (!stake) {
        res.status(404).json({ error: "No active stake found" });
        return;
      }

      const unstakeAmount = BigInt(body.amount);
      const current = BigInt(stake.amount);
      if (unstakeAmount <= 0n || unstakeAmount > current) {
        res.status(400).json({ error: "Invalid unstake amount" });
        return;
      }

      if (unstakeAmount === current) {
        await prisma.launchpoolStake.update({
          where: { id: stake.id },
          data: { isActive: false, unstakedAt: new Date(), amount: "0" },
        });
      } else {
        await prisma.launchpoolStake.update({
          where: { id: stake.id },
          data: { amount: (current - unstakeAmount).toString() },
        });
      }

      res.json({ ok: true });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }
      console.error("[DELETE /api/launchpool/[id]/stake]", e);
      res.status(500).json({ error: "Unstake failed" });
    }
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const pool = await prisma.launchpool.findFirst({
        where: { id, isPublished: true },
        include: { stakeAssets: true },
      });

      if (!pool) {
        res.status(404).json({ error: "Launchpool not found" });
        return;
      }

      const stats = await getLaunchpoolStakeStats(pool.id);
      res.json({ pool: serializeLaunchpool(pool, stats) });
    } catch (e) {
      console.error("[GET /api/launchpool/[id]]", e);
      res.status(500).json({ error: "Failed to load launchpool" });
    }
  })
);

export default router;
