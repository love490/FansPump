import { Router } from "express";
import { type Prisma } from "@iopn/database";
import { isAddress } from "viem";
import { z } from "zod";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { ensureCreatorProfile } from "@/lib/v2/reputation";
import {
  bountyDetailInclude,
  bountyListInclude,
  bountyTabOrderBy,
  bountyTabWhere,
  mapBountyRow,
  resolveEffectiveStatus,
  type BountyTab,
} from "@/lib/bounties";
import {
  mergeBountyVerificationConfig,
  resolvePrimaryTaskType,
  validateBountyTaskSelection,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";
import { getPublicClient } from "@/lib/rpc-client";
import { verifyOnchainRequirement } from "@/lib/quests/onchain-verify";
import {
  parseParticipationProof,
  parseVerificationConfig,
  type ParticipationProof,
} from "@/lib/quests/verification-types";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const TAB_IDS = [
  "trending",
  "active",
  "completed",
  "ended",
  "featured",
  "newest",
  "ending_soon",
] as const;

const taskTypeEnum = z.enum([
  "SOCIAL",
  "ENGAGEMENT",
  "GROWTH",
  "CONTENT",
  "REFERRAL",
  "COMMUNITY",
  "CUSTOM",
]);

const socialActionEnum = z.enum([
  "X_FOLLOW",
  "X_LIKE",
  "X_COMMENT",
  "X_QUOTE",
  "TELEGRAM_JOIN",
  "DISCORD_JOIN",
]);

const onchainConfigSchema = z
  .object({
    taskTypes: z.array(taskTypeEnum).optional(),
    socialActions: z.array(socialActionEnum).optional(),
    requirementType: z.enum(["HOLD_TOKEN", "ADD_LIQUIDITY", "SWAP", "STAKE"]).optional(),
    tokenAddress: z.string().optional(),
    minAmount: z.string().optional(),
    pairId: z.enum(["OPN", "WOPN", "USDT"]).optional(),
    minLpAmount: z.string().optional(),
  })
  .optional()
  .nullable();

const createSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  taskType: taskTypeEnum,
  taskTypes: z.array(taskTypeEnum).min(1).optional(),
  socialActions: z.array(socialActionEnum).optional(),
  requirements: z.string().max(2000).optional().nullable(),
  rewardType: z.enum(["OPN", "TOKEN", "CUSTOM", "XP"]),
  rewardAmount: z.string().min(1).max(64),
  rewardDescription: z.string().max(200).optional().nullable(),
  maxParticipants: z.number().int().min(1).max(10000),
  endsAt: z.string().datetime().optional().nullable(),
  tokenAddress: z.string().optional().nullable(),
  verificationMethod: z.enum(["MANUAL", "ONCHAIN", "API"]).optional(),
  verificationConfig: onchainConfigSchema,
});

const authSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

const submitSchema = authSchema.extend({
  proof: z
    .object({
      note: z.string().max(2000).optional(),
      proofUrl: z.string().url().optional(),
      txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
      screenshotUrl: z.string().url().optional(),
    })
    .optional(),
});

const verifySchema = authSchema.extend({
  participantWallet: z.string(),
  approve: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
});

const router = Router();

router.use(publicRateLimit);

function mapParticipation(p: {
  status: string;
  proofJson?: unknown | null;
  verifiedAt?: Date | null;
  claimedAt?: Date | null;
  rejectionReason?: string | null;
}) {
  return {
    status: p.status,
    proofJson: p.proofJson ?? null,
    verifiedAt: p.verifiedAt?.toISOString() ?? null,
    claimedAt: p.claimedAt?.toISOString() ?? null,
    rejectionReason: p.rejectionReason ?? null,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const tab = (searchParams.get("tab") ?? "trending") as BountyTab;
    const creatorWallet = searchParams.get("creator")?.toLowerCase();
    const tokenAddress = searchParams.get("token")?.toLowerCase();
    const scope = searchParams.get("scope");
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 50);

    if (scope !== "mine" && !TAB_IDS.includes(tab as (typeof TAB_IDS)[number])) {
      res.status(400).json({ error: "Invalid tab" });
      return;
    }

    try {
      const where: Prisma.BountyWhereInput =
        creatorWallet && scope === "mine"
          ? { creatorWallet }
          : {
              ...bountyTabWhere(tab),
              ...(creatorWallet ? { creatorWallet } : {}),
              ...(tokenAddress ? { tokenAddress } : {}),
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
      res.status(500).json({ error: "Failed to load quests" });
    }
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);
    const viewerWallet = queryToSearchParams(req.query).get("wallet")?.toLowerCase();

    try {
      const bounty = await prisma.bounty.findUnique({
        where: { id },
        include: bountyDetailInclude,
      });

      if (!bounty) {
        res.status(404).json({ error: "Quest not found" });
        return;
      }

      await prisma.bounty.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      const verifiedCount = bounty.participations.filter(
        (p) => p.status === "VERIFIED" || p.status === "CLAIMED"
      ).length;

      const myParticipation = viewerWallet
        ? bounty.participations.find((p) => p.walletAddress === viewerWallet)
        : undefined;

      res.json({
        bounty: {
          ...mapBountyRow({ ...bounty, _count: { participations: bounty.participations.length } }),
          completionCount: verifiedCount,
        },
        myParticipation: myParticipation ? mapParticipation(myParticipation) : null,
      });
    } catch (e) {
      console.error("[GET /api/bounties/:id]", e);
      res.status(500).json({ error: "Failed to load quest" });
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

      if (parsed.rewardType === "TOKEN") {
        const symbol = parsed.rewardDescription?.trim();
        if (!tokenAddress && !symbol) {
          res.status(400).json({ error: "Enter a token symbol (e.g. WIF, MAGO) or link a token" });
          return;
        }
      }

      const verificationMethod = parsed.verificationMethod ?? "MANUAL";
      if (verificationMethod === "ONCHAIN" && !parsed.verificationConfig?.requirementType) {
        res.status(400).json({ error: "On-chain quests require a requirement type" });
        return;
      }

      const taskTypes = parsed.taskTypes?.length ? parsed.taskTypes : [parsed.taskType];
      const socialActions = (parsed.socialActions ?? []) as SocialBountyActionId[];
      const taskError = validateBountyTaskSelection(taskTypes, socialActions);
      if (taskError) {
        res.status(400).json({ error: taskError });
        return;
      }

      const primaryTaskType = resolvePrimaryTaskType(taskTypes);
      const verificationConfig = mergeBountyVerificationConfig(
        parsed.verificationConfig,
        taskTypes,
        socialActions
      );

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
          taskType: primaryTaskType,
          requirements: parsed.requirements?.trim() || null,
          rewardType: parsed.rewardType,
          rewardAmount: parsed.rewardAmount.trim(),
          rewardDescription: parsed.rewardDescription?.trim() || null,
          verificationMethod,
          verificationConfig: verificationConfig ?? undefined,
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
        res.status(400).json({ error: "Invalid quest details" });
        return;
      }
      console.error("[POST /api/bounties]", e);
      res.status(500).json({ error: "Failed to create quest" });
    }
  })
);

router.post(
  "/:id/join",
  asyncHandler(async (req, res) => {
    try {
      const id = getRouteParam(req.params.id);
      const body = authSchema.parse(req.body);
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
        res.status(404).json({ error: "Quest not found" });
        return;
      }

      const effectiveStatus = resolveEffectiveStatus(bounty);
      if (effectiveStatus !== "active") {
        res.status(400).json({ error: "This quest is no longer active" });
        return;
      }

      if (bounty._count.participations >= bounty.maxParticipants) {
        res.status(409).json({ error: "This quest is full" });
        return;
      }

      const existing = await prisma.bountyParticipation.findUnique({
        where: { bountyId_walletAddress: { bountyId: id, walletAddress: wallet } },
      });

      if (existing) {
        res.json({ ok: true, participation: mapParticipation(existing) });
        return;
      }

      const participation = await prisma.$transaction(async (tx) => {
        const row = await tx.bountyParticipation.create({
          data: { bountyId: id, walletAddress: wallet, status: "JOINED" },
        });
        await tx.bounty.update({
          where: { id },
          data: { participantCount: { increment: 1 } },
        });
        return row;
      });

      res.json({ ok: true, participation: mapParticipation(participation) });
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
      res.status(500).json({ error: "Failed to join quest" });
    }
  })
);

router.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const body = submitSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(body);
      const proof: ParticipationProof = body.proof ?? {};

      const bounty = await prisma.bounty.findUnique({ where: { id } });
      if (!bounty) {
        res.status(404).json({ error: "Quest not found" });
        return;
      }

      if (resolveEffectiveStatus(bounty) !== "active") {
        res.status(400).json({ error: "Quest is not active" });
        return;
      }

      const participation = await prisma.bountyParticipation.findUnique({
        where: { bountyId_walletAddress: { bountyId: id, walletAddress: wallet } },
      });

      if (!participation) {
        res.status(400).json({ error: "Join the quest before submitting" });
        return;
      }

      if (participation.status === "VERIFIED" || participation.status === "CLAIMED") {
        res.status(409).json({ error: "Quest already verified" });
        return;
      }

      if (bounty.verificationMethod === "MANUAL") {
        if (!proof.proofUrl && !proof.note && !proof.screenshotUrl) {
          res.status(400).json({ error: "Provide proof URL or completion notes" });
          return;
        }

        const updated = await prisma.bountyParticipation.update({
          where: { id: participation.id },
          data: {
            status: "SUBMITTED",
            proofJson: proof,
            rejectionReason: null,
          },
        });

        res.json({ ok: true, participation: mapParticipation(updated), autoVerified: false });
        return;
      }

      if (bounty.verificationMethod === "ONCHAIN") {
        const config = parseVerificationConfig(bounty.verificationConfig);
        if (!config) {
          res.status(400).json({ error: "Quest on-chain config missing" });
          return;
        }

        const client = getPublicClient();
        const result = await verifyOnchainRequirement(client, wallet, config, {
          bountyTokenAddress: bounty.tokenAddress,
          proofTxHash: proof.txHash,
        });

        if (!result.ok) {
          res.status(400).json({ error: result.reason ?? "On-chain verification failed", details: result.details });
          return;
        }

        const updated = await prisma.bountyParticipation.update({
          where: { id: participation.id },
          data: {
            status: "VERIFIED",
            proofJson: { ...proof, onchain: result.details } as Prisma.InputJsonValue,
            verifiedAt: new Date(),
            verifiedBy: "system:onchain",
            rejectionReason: null,
          },
        });

        res.json({ ok: true, participation: mapParticipation(updated), autoVerified: true });
        return;
      }

      res.status(400).json({ error: "API verification is not enabled yet" });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid submission" });
        return;
      }
      console.error("[POST /api/bounties/:id/submit]", e);
      res.status(500).json({ error: "Failed to submit quest" });
    }
  })
);

router.post(
  "/:id/verify",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const body = verifySchema.parse(req.body);
      const creatorWallet = await requireCreatorActionAuth(body);
      const participantWallet = body.participantWallet.toLowerCase();

      const bounty = await prisma.bounty.findUnique({ where: { id } });
      if (!bounty) {
        res.status(404).json({ error: "Quest not found" });
        return;
      }

      if (bounty.creatorWallet !== creatorWallet) {
        res.status(403).json({ error: "Only the quest creator can verify submissions" });
        return;
      }

      const participation = await prisma.bountyParticipation.findUnique({
        where: { bountyId_walletAddress: { bountyId: id, walletAddress: participantWallet } },
      });

      if (!participation || participation.status === "JOINED") {
        res.status(400).json({ error: "Participant has not submitted proof yet" });
        return;
      }

      const updated = await prisma.bountyParticipation.update({
        where: { id: participation.id },
        data: body.approve
          ? {
              status: "VERIFIED",
              verifiedAt: new Date(),
              verifiedBy: creatorWallet,
              rejectionReason: null,
            }
          : {
              status: "REJECTED",
              rejectionReason: body.rejectionReason?.trim() || "Submission rejected",
            },
      });

      res.json({ ok: true, participation: mapParticipation(updated) });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid verification request" });
        return;
      }
      console.error("[POST /api/bounties/:id/verify]", e);
      res.status(500).json({ error: "Failed to verify submission" });
    }
  })
);

router.post(
  "/:id/claim",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const body = authSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(body);

      const participation = await prisma.bountyParticipation.findUnique({
        where: { bountyId_walletAddress: { bountyId: id, walletAddress: wallet } },
        include: { bounty: true },
      });

      if (!participation) {
        res.status(404).json({ error: "You have not joined this quest" });
        return;
      }

      if (participation.status !== "VERIFIED") {
        res.status(400).json({ error: "Quest must be verified before claiming" });
        return;
      }

      const updated = await prisma.bountyParticipation.update({
        where: { id: participation.id },
        data: {
          status: "CLAIMED",
          claimedAt: new Date(),
        },
      });

      res.json({
        ok: true,
        participation: mapParticipation(updated),
        reward: {
          type: participation.bounty.rewardType,
          amount: participation.bounty.rewardAmount,
          description: participation.bounty.rewardDescription,
          tokenAddress: participation.bounty.tokenAddress,
        },
      });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid claim request" });
        return;
      }
      console.error("[POST /api/bounties/:id/claim]", e);
      res.status(500).json({ error: "Failed to claim reward" });
    }
  })
);

export default router;
