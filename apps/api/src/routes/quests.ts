import { Router } from "express";
import { isAddress } from "viem";
import { z } from "zod";
import { getV2FeatureFlags } from "../lib/v2/feature-flags";
import { requireCreatorActionAuth, CreatorAuthError } from "../lib/creator-auth";
import { ensureCreatorProfile, awardReputation } from "../lib/v2/reputation";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const createSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
  tokenAddress: z.string().optional(),
  questType: z.enum(["SOCIAL", "ENGAGEMENT", "GROWTH", "COMMUNITY"]),
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(2000),
  targetUrl: z.string().url().optional().nullable(),
  targetMetric: z.string().optional().nullable(),
  targetValue: z.number().int().positive().optional().nullable(),
  rewardXp: z.number().int().min(0).max(1000).optional(),
  rewardReputation: z.number().int().min(0).max(500).optional(),
});

const completeSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const flags = getV2FeatureFlags();
    if (!flags.creatorQuests) {
      res.json({ enabled: false, quests: [] });
      return;
    }

    const searchParams = queryToSearchParams(req.query);
    const creatorWallet = searchParams.get("creator")?.toLowerCase();
    const tokenAddress = searchParams.get("token")?.toLowerCase();

    const where: Record<string, unknown> = { status: "ACTIVE" };
    if (creatorWallet) where.creatorWallet = creatorWallet;
    if (tokenAddress) where.tokenAddress = tokenAddress;

    try {
      const quests = await prisma.creatorQuest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { _count: { select: { completions: true } } },
      });

      res.json({
        enabled: true,
        quests: quests.map((q) => ({
          id: q.id,
          creatorWallet: q.creatorWallet,
          tokenAddress: q.tokenAddress,
          questType: q.questType,
          title: q.title,
          description: q.description,
          targetUrl: q.targetUrl,
          targetMetric: q.targetMetric,
          targetValue: q.targetValue,
          rewardXp: q.rewardXp,
          rewardReputation: q.rewardReputation,
          status: q.status,
          completions: q._count.completions,
          createdAt: q.createdAt.toISOString(),
        })),
      });
    } catch (e) {
      console.error("[GET /api/quests]", e);
      res.status(500).json({ error: "Failed to load quests" });
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const flags = getV2FeatureFlags();
    if (!flags.creatorQuests) {
      res.status(403).json({ error: "Quests disabled" });
      return;
    }

    try {
      const parsed = createSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(parsed);

      await ensureCreatorProfile(wallet);

      let tokenId: string | undefined;
      let tokenAddress: string | undefined;
      if (parsed.tokenAddress) {
        if (!isAddress(parsed.tokenAddress)) {
          res.status(400).json({ error: "Invalid token address" });
          return;
        }
        const token = await prisma.tokenProject.findUnique({
          where: { contractAddress: parsed.tokenAddress.toLowerCase() },
        });
        if (!token || token.creatorAddress !== wallet) {
          res.status(403).json({ error: "Not token creator" });
          return;
        }
        tokenId = token.id;
        tokenAddress = token.contractAddress;
      }

      const quest = await prisma.creatorQuest.create({
        data: {
          creatorWallet: wallet,
          tokenId,
          tokenAddress,
          questType: parsed.questType,
          title: parsed.title,
          description: parsed.description,
          targetUrl: parsed.targetUrl ?? null,
          targetMetric: parsed.targetMetric ?? null,
          targetValue: parsed.targetValue ?? null,
          rewardXp: parsed.rewardXp ?? 10,
          rewardReputation: parsed.rewardReputation ?? 5,
        },
      });

      res.json({ quest: { id: quest.id, title: quest.title } });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      console.error("[POST /api/quests]", e);
      res.status(500).json({ error: "Failed to create quest" });
    }
  })
);

router.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const flags = getV2FeatureFlags();
    if (!flags.creatorQuests) {
      res.status(403).json({ error: "Quests disabled" });
      return;
    }

    const id = getRouteParam(req.params.id);

    try {
      const parsed = completeSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(parsed);

      const quest = await prisma.creatorQuest.findUnique({ where: { id } });
      if (!quest || quest.status !== "ACTIVE") {
        res.status(404).json({ error: "Quest not found" });
        return;
      }

      const existing = await prisma.questCompletion.findUnique({
        where: { questId_walletAddress: { questId: id, walletAddress: wallet } },
      });
      if (existing) {
        res.status(409).json({ error: "Already completed" });
        return;
      }

      await prisma.$transaction([
        prisma.questCompletion.create({
          data: { questId: id, walletAddress: wallet },
        }),
        prisma.creatorProfile.upsert({
          where: { walletAddress: quest.creatorWallet },
          create: {
            walletAddress: quest.creatorWallet,
            questsCompleted: 1,
            fansPumpXp: quest.rewardXp,
            reputationScore: quest.rewardReputation,
          },
          update: {
            questsCompleted: { increment: 1 },
            fansPumpXp: { increment: quest.rewardXp },
            reputationScore: { increment: quest.rewardReputation },
          },
        }),
      ]);

      if (flags.reputationSystem) {
        await awardReputation(wallet, {
          xp: Math.max(1, Math.floor(quest.rewardXp / 2)),
          reputation: Math.max(1, Math.floor(quest.rewardReputation / 2)),
        });
      }

      res.json({ ok: true });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      console.error("[POST /api/quests/:id/complete]", e);
      res.status(500).json({ error: "Failed to complete quest" });
    }
  })
);

export default router;

