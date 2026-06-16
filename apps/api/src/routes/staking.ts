import { Router } from "express";
import { z } from "zod";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import {
  getStakingPlatformConfig,
  serializeStakingPosition,
} from "@/lib/staking/config";
import { computeWalletStakingTier } from "@/lib/staking/tier";
import { consolidateStakingPositions } from "@/lib/staking/consolidate";
import { stakingPositionGroupWhere } from "@/lib/staking/position-key";
import prisma from "../lib/prisma";
import { asyncHandler, queryToSearchParams, setCacheControl } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const stakeSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  assetType: z.enum(["OPN", "LP_TOKEN"]),
  asset: z.string().min(1).max(128),
  amount: z.string().regex(/^\d+$/),
  poolAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  tier: z.string().optional(),
  message: z.string(),
  signature: z.string(),
});

const router = Router();

router.use(publicRateLimit);

router.get(
  "/config",
  asyncHandler(async (_req, res) => {
    try {
      const config = await getStakingPlatformConfig();
      res.json({
        config: {
          tiers: config.tiers,
          visibilityBoostEnabled: config.visibilityBoostEnabled,
          discoveryRankingBoostEnabled: config.discoveryRankingBoostEnabled,
          opnStakingEnabled: config.opnStakingEnabled,
          lpStakingEnabled: config.lpStakingEnabled,
          supportedLpPools: config.supportedLpPools.filter((p) => p.enabled),
          rewardsActive: false,
          apyEnabled: false,
        },
      });
    } catch (e) {
      console.error("[GET /api/staking/config]", e);
      res.status(500).json({ error: "Failed to load staking config" });
    }
  })
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    try {
      const [active, launchpoolOpn] = await Promise.all([
        prisma.stakingPosition.findMany({
          where: { isActive: true },
          select: { wallet: true, assetType: true, amount: true },
        }),
        prisma.launchpoolStake.findMany({
          where: { isActive: true, assetSymbol: { equals: "OPN", mode: "insensitive" } },
          select: { walletAddress: true, amount: true },
        }),
      ]);

      let totalOpnWei = 0n;
      let totalLpAmount = 0n;
      let lpStakeCount = 0;
      const stakers = new Set<string>();

      for (const row of active) {
        stakers.add(row.wallet.toLowerCase());
        try {
          const amount = BigInt(row.amount || "0");
          if (row.assetType === "OPN") {
            totalOpnWei += amount;
          } else {
            totalLpAmount += amount;
            lpStakeCount += 1;
          }
        } catch {
          /* skip invalid amount */
        }
      }

      for (const row of launchpoolOpn) {
        stakers.add(row.walletAddress.toLowerCase());
        try {
          totalOpnWei += BigInt(row.amount || "0");
        } catch {
          /* skip */
        }
      }

      setCacheControl(res, "public, s-maxage=30, stale-while-revalidate=60");
      res.json({
        activeStakers: stakers.size,
        activeStakePositions: active.length + launchpoolOpn.length,
        totalStakedOpnWei: totalOpnWei.toString(),
        totalStakedLpAmount: totalLpAmount.toString(),
        lpStakeCount,
      });
    } catch (e) {
      console.error("[GET /api/staking/stats]", e);
      res.status(500).json({ error: "Failed to load staking stats" });
    }
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const wallet = queryToSearchParams(req.query).get("wallet")?.toLowerCase();
    if (!wallet) {
      res.status(400).json({ error: "wallet required" });
      return;
    }

    try {
      await consolidateStakingPositions(wallet);

      const [positions, config] = await Promise.all([
        prisma.stakingPosition.findMany({
          where: { wallet, isActive: true },
          orderBy: { stakedAt: "desc" },
        }),
        getStakingPlatformConfig(),
      ]);

      const tier = await computeWalletStakingTier(wallet, config);

      res.json({
        positions: positions.map(serializeStakingPosition),
        walletTier: tier,
        rewardsActive: false,
      });
    } catch (e) {
      console.error("[GET /api/staking]", e);
      res.status(500).json({ error: "Failed to load staking positions" });
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const body = stakeSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth({
        walletAddress: body.wallet,
        message: body.message,
        signature: body.signature,
      });

      const config = await getStakingPlatformConfig();

      if (body.assetType === "OPN" && !config.opnStakingEnabled) {
        res.status(403).json({ error: "OPN staking is disabled" });
        return;
      }
      if (body.assetType === "LP_TOKEN" && !config.lpStakingEnabled) {
        res.status(403).json({ error: "LP staking is disabled" });
        return;
      }

      const normalizedAsset = body.assetType === "OPN" ? "opn" : body.asset.toLowerCase();
      const extraOpnWei = body.assetType === "OPN" ? BigInt(body.amount) : 0n;
      const tier =
        body.tier ??
        (body.assetType === "OPN"
          ? await computeWalletStakingTier(wallet, config, extraOpnWei)
          : null);

      const existing = await prisma.stakingPosition.findFirst({
        where: stakingPositionGroupWhere(wallet, body.assetType, normalizedAsset),
      });

      let position;
      if (existing) {
        const mergedAmount = (BigInt(existing.amount) + BigInt(body.amount)).toString();
        position = await prisma.stakingPosition.update({
          where: { id: existing.id },
          data: {
            amount: mergedAmount,
            poolAddress: body.poolAddress?.toLowerCase() ?? existing.poolAddress,
            tokenAddress: body.tokenAddress?.toLowerCase() ?? existing.tokenAddress,
            tier: body.assetType === "OPN" ? tier : existing.tier,
          },
        });
      } else {
        position = await prisma.stakingPosition.create({
          data: {
            wallet,
            assetType: body.assetType,
            asset: normalizedAsset,
            amount: body.amount,
            poolAddress: body.poolAddress?.toLowerCase() ?? null,
            tokenAddress: body.tokenAddress?.toLowerCase() ?? null,
            tier,
          },
        });
      }

      res.json({
        position: serializeStakingPosition(position),
      });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }
      console.error("[POST /api/staking]", e);
      res.status(500).json({ error: "Failed to record stake" });
    }
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const body = z
        .object({
          wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
          positionId: z.string(),
          amount: z.string().regex(/^\d+$/).optional(),
          message: z.string(),
          signature: z.string(),
        })
        .parse(req.body);

      const wallet = await requireCreatorActionAuth({
        walletAddress: body.wallet,
        message: body.message,
        signature: body.signature,
      });

      const existing = await prisma.stakingPosition.findFirst({
        where: { id: body.positionId, wallet, isActive: true },
      });

      if (!existing) {
        res.status(404).json({ error: "Position not found" });
        return;
      }

      const stakedWei = BigInt(existing.amount);
      const unstakeWei = body.amount ? BigInt(body.amount) : stakedWei;

      if (unstakeWei <= 0n) {
        res.status(400).json({ error: "Unstake amount must be greater than zero" });
        return;
      }
      if (unstakeWei > stakedWei) {
        res.status(400).json({ error: "Unstake amount exceeds staked balance" });
        return;
      }

      const remaining = stakedWei - unstakeWei;
      const config = await getStakingPlatformConfig();

      let position;
      if (remaining === 0n) {
        position = await prisma.stakingPosition.update({
          where: { id: existing.id },
          data: { isActive: false, unstakedAt: new Date(), amount: "0" },
        });
      } else {
        position = await prisma.stakingPosition.update({
          where: { id: existing.id },
          data: { amount: remaining.toString() },
        });
        if (existing.assetType === "OPN") {
          const tier = await computeWalletStakingTier(wallet, config);
          position = await prisma.stakingPosition.update({
            where: { id: existing.id },
            data: { tier },
          });
        }
      }

      res.json({
        position: serializeStakingPosition(position),
        unstakedAmount: unstakeWei.toString(),
        remainingAmount: remaining.toString(),
      });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }
      console.error("[DELETE /api/staking]", e);
      res.status(500).json({ error: "Failed to unstake" });
    }
  })
);

export default router;
