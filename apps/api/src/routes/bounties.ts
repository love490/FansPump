import { Router } from "express";
import { type Prisma } from "@iopn/database";
import { isAddress } from "viem";
import { z } from "zod";
import { requireCreatorActionAuth, CreatorAuthError } from "../lib/creator-auth";
import { ensureCreatorProfile } from "../lib/v2/reputation";
import {
  bountyListInclude,
  bountyTabOrderBy,
  bountyTabWhere,
  mapBountyRow,
  resolveEffectiveStatus,
  type BountyTab,
} from "../lib/bounties";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const TAB_IDS = ["trending", "active", "completed", "ended"] as const;

const createSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  taskType: z.enum(["SOCIAL", "CONTENT", "REFERRAL", "COMMUNITY", "CUSTOM"]),
  requirements: z.string().max(2000).optional().nullable(),
  rewardType: z.enum(["OPN", "TOKEN", "CUSTOM", "XP"]),
  rewardAmount: z.string().min(1).max(64),
  rewardDescription: z.string().max(200).optional().nullable(),
  maxParticipants: z.number().int().min(1).max(10000),
  endsAt: z.string().datetime().optional().nullable(),
  tokenAddress: z.string().optional().nullable(),
});

const joinSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const tab = (searchParams.get("tab") ?? "trending") as BountyTab;
    const creatorWallet = searchParams.get("creator")?.toLowerCase();
    const scope = searchParams.get("scope");
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 50);

    if (scope !== "mine" && !TAB_IDS.includes(tab as (typeof TAB_IDS)[number])) {
      res.status(400).json({ error: "Invalid tab" });
      return;
    }

    try {
      const where =
        creatorWallet && scope === "mine"
          ? { creatorWallet }
          : {
              ...bountyTabWhere(tab),
              ...(creatorWallet ? { creatorWallet } : {}),
            };

      const orderBy: Prisma.BountyOrderByWithRelationInput[] =
        creatorWallet && scope === "mine" ? [{ createdAt: "desc" }] : bountyTabOrderBy(tab);

      const bounties = await prisma.bounty.findMany({
        where,
        orderBy,
        take: limit,
        include: bountyListInclude,
      });

      res.json({
        tab,
        bounties: bounties.map(mapBountyRow),
      });
    } catch (e) {
      console.error("[GET /api/bounties]", e);
      res.status(500).json({ error: "Failed to load bounties" });
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const parsed = createSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(parsed);

      await ensureCreatorProfile(wallet);

      await prisma.user.upsert({
        where: { walletAddress: wallet },
        create: { walletAddress: wallet },
        update: {},
      });

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
          res.status(403).json({ error: "You can only link your own tokens" });
          return;
        }
        tokenId = token.id;
        tokenAddress = token.contractAddress;
      }

      if (parsed.rewardType === "TOKEN" && !tokenAddress) {
        res.status(400).json({ error: "Select a token for token rewards" });
        return;
      }

      const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;
      if (endsAt && Number.isNaN(endsAt.getTime())) {
        res.status(400).json({ error: "Invalid end date" });
        return;
      }

      const bounty = await prisma.bounty.create({
        data: {
          creatorWallet: wallet,
          tokenId,
          tokenAddress,
          title: parsed.title.trim(),
          description: parsed.description.trim(),
          taskType: parsed.taskType,
          requirements: parsed.requirements?.trim() || null,
          rewardType: parsed.rewardType,
          rewardAmount: parsed.rewardAmount.trim(),
          rewardDescription: parsed.rewardDescription?.trim() || null,
          maxParticipants: parsed.maxParticipants,
          endsAt,
        },
        include: bountyListInclude,
      });

      res.json({ bounty: mapBountyRow(bounty) });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid bounty details" });
        return;
      }
      console.error("[POST /api/bounties]", e);
      res.status(500).json({ error: "Failed to create bounty" });
    }
  })
);

router.post(
  "/:id/join",
  asyncHandler(async (req, res) => {
    try {
      const id = getRouteParam(req.params.id);
      const body = joinSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(body);

      await prisma.user.upsert({
        where: { walletAddress: wallet },
        create: { walletAddress: wallet },
        update: {},
      });

      const bounty = await prisma.bounty.findUnique({
        where: { id },
        include: { _count: { select: { participations: true } } },
      });

      if (!bounty) {
        res.status(404).json({ error: "Bounty not found" });
        return;
      }

      if (bounty.creatorWallet === wallet) {
        res.status(400).json({ error: "Creators cannot join their own bounty" });
        return;
      }

      const effectiveStatus = resolveEffectiveStatus(bounty);
      if (effectiveStatus !== "active") {
        res.status(400).json({ error: "This bounty is no longer active" });
        return;
      }

      if (bounty._count.participations >= bounty.maxParticipants) {
        res.status(409).json({ error: "This bounty is full" });
        return;
      }

      const existing = await prisma.bountyParticipation.findUnique({
        where: { bountyId_walletAddress: { bountyId: id, walletAddress: wallet } },
      });

      if (existing) {
        res.status(409).json({ error: "You already joined this bounty" });
        return;
      }

      await prisma.$transaction([
        prisma.bountyParticipation.create({
          data: { bountyId: id, walletAddress: wallet },
        }),
        prisma.bounty.update({
          where: { id },
          data: { participantCount: { increment: 1 } },
        }),
      ]);

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
      console.error("[POST /api/bounties/:id/join]", e);
      res.status(500).json({ error: "Failed to join bounty" });
    }
  })
);

export default router;

