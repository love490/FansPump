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
import { createQuizForBounty, getQuizByBountyId, gradeQuizAttempt, mapPublicQuiz, buildSubmitResult } from "@/lib/quiz/service";
import { quizInputSchema, quizSubmitSchema } from "@/lib/quiz/schemas";
import { validateQuizInput } from "@/lib/quiz/validate";
import { awardBountyCompletionXp, getCreatorBountyLeaderboard } from "@/lib/bounties/xp";
import {
  allStepsClaimed,
  allSocialStepsVerified,
  mergeStepProof,
  parseStepProof,
  QUIZ_STEP_ID,
  resolveQuestSteps,
  stepXpPoints,
  sumStepXpPoints,
  totalQuestXp,
  hasOnchainBonusReward,
} from "@/lib/bounties/step-progress";
import { verifySocialBountyStep } from "@/lib/bounties/social-step-verify";
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

const taskStepSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["social", "custom", "question"]),
  actionId: socialActionEnum.optional(),
  instruction: z.string().min(1).max(500),
  linkUrl: z.string().max(500).optional(),
  buttonLabel: z.string().max(40).optional(),
  xpPoints: z.number().int().min(0).max(10000).optional(),
});

const onchainConfigSchema = z
  .object({
    taskTypes: z.array(taskTypeEnum).optional(),
    socialActions: z.array(socialActionEnum).optional(),
    taskSteps: z.array(taskStepSchema).optional(),
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
  xpReward: z.number().int().min(0).max(100000).optional(),
  maxParticipants: z.number().int().min(1).max(10000).optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  tokenAddress: z.string().optional().nullable(),
  verificationMethod: z.enum(["MANUAL", "ONCHAIN", "API", "QUIZ"]).optional(),
  verificationConfig: onchainConfigSchema,
  quiz: quizInputSchema.optional(),
  quizXpPoints: z.number().int().min(1).max(10000).optional(),
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
  xpAwarded?: number;
}) {
  return {
    status: p.status,
    proofJson: p.proofJson ?? null,
    verifiedAt: p.verifiedAt?.toISOString() ?? null,
    claimedAt: p.claimedAt?.toISOString() ?? null,
    rejectionReason: p.rejectionReason ?? null,
    xpAwarded: p.xpAwarded ?? 0,
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
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const creatorWallet = searchParams.get("creator")?.toLowerCase();
    const tokenAddress = searchParams.get("token")?.toLowerCase() ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    if (!creatorWallet || !/^0x[a-f0-9]{40}$/.test(creatorWallet)) {
      res.status(400).json({ error: "Valid creator wallet required" });
      return;
    }

    try {
      const data = await getCreatorBountyLeaderboard(creatorWallet, { tokenAddress, limit });
      res.json(data);
    } catch (e) {
      console.error("[GET /api/bounties/leaderboard]", e);
      res.status(500).json({ error: "Failed to load leaderboard" });
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
      if (verificationMethod === "QUIZ" && !parsed.quiz) {
        res.status(400).json({ error: "Quiz quests require quiz questions" });
        return;
      }

      const taskTypes = parsed.taskTypes?.length ? parsed.taskTypes : [parsed.taskType];
      const socialActions = (parsed.socialActions ?? []) as SocialBountyActionId[];
      const taskSteps = parsed.verificationConfig?.taskSteps ?? [];
      if (verificationMethod !== "QUIZ") {
        const taskError = validateBountyTaskSelection(taskTypes, socialActions, taskSteps);
        if (taskError) {
          res.status(400).json({ error: taskError });
          return;
        }
      }

      if (verificationMethod === "QUIZ" && parsed.quiz) {
        const quizError = validateQuizInput(parsed.quiz);
        if (quizError) {
          res.status(400).json({ error: quizError });
          return;
        }
      }

      const primaryTaskType =
        verificationMethod === "QUIZ" ? "CUSTOM" : resolvePrimaryTaskType(taskTypes);
      let verificationConfig =
        verificationMethod === "QUIZ"
          ? null
          : mergeBountyVerificationConfig(parsed.verificationConfig, taskTypes, socialActions, {
              taskSteps,
            });

      const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;
      if (endsAt && Number.isNaN(endsAt.getTime())) {
        res.status(400).json({ error: "Invalid end date" });
        return;
      }

      let xpReward = 0;
      if (verificationMethod === "QUIZ") {
        if (!parsed.quizXpPoints || parsed.quizXpPoints < 1) {
          res.status(400).json({ error: "Set XP points for the quiz (1 or more)" });
          return;
        }
        xpReward = parsed.quizXpPoints;
        verificationConfig = { quizXpPoints: parsed.quizXpPoints };
      } else {
        xpReward = sumStepXpPoints(taskSteps);
        if (xpReward < 1) {
          res.status(400).json({ error: "Set XP points on each task step (1 or more)" });
          return;
        }
      }

      const bounty = await prisma.$transaction(async (tx) => {
        const row = await tx.bounty.create({
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
            xpReward,
            verificationMethod,
            verificationConfig: verificationConfig ?? undefined,
            maxParticipants: parsed.maxParticipants ?? null,
            endsAt,
          },
        });

        if (verificationMethod === "QUIZ" && parsed.quiz) {
          await createQuizForBounty(tx, row.id, parsed.quiz);
        }

        return tx.bounty.findUniqueOrThrow({
          where: { id: row.id },
          include: bountyListInclude,
        });
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

      if (bounty.maxParticipants != null && bounty._count.participations >= bounty.maxParticipants) {
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

async function loadActiveParticipation(bountyId: string, wallet: string) {
  const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });
  if (!bounty) return { error: "not_found" as const };
  if (resolveEffectiveStatus(bounty) !== "active") {
    return { error: "inactive" as const };
  }
  const participation = await prisma.bountyParticipation.findUnique({
    where: { bountyId_walletAddress: { bountyId, walletAddress: wallet } },
  });
  if (!participation) return { error: "not_joined" as const };
  return { bounty, participation };
}

router.post(
  "/:id/steps/:stepId/visit",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);
    const stepId = getRouteParam(req.params.stepId);

    try {
      const body = authSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(body);
      const loaded = await loadActiveParticipation(id, wallet);
      if ("error" in loaded) {
        const code = loaded.error;
        if (code === "not_found") res.status(404).json({ error: "Quest not found" });
        else if (code === "inactive") res.status(400).json({ error: "Quest is not active" });
        else res.status(400).json({ error: "Join the quest first" });
        return;
      }

      const { bounty, participation } = loaded;
      const steps = resolveQuestSteps(bounty);
      if (!steps.some((s) => s.id === stepId)) {
        res.status(400).json({ error: "Invalid quest step" });
        return;
      }

      const proof = parseStepProof(participation.proofJson);
      const stepProgress = { ...(proof.stepProgress ?? {}) };
      const existing = stepProgress[stepId] ?? {};
      stepProgress[stepId] = {
        ...existing,
        visitedAt: existing.visitedAt ?? new Date().toISOString(),
      };

      const updated = await prisma.bountyParticipation.update({
        where: { id: participation.id },
        data: {
          proofJson: mergeStepProof(participation.proofJson, { stepProgress }) as Prisma.InputJsonValue,
        },
      });

      res.json({ ok: true, participation: mapParticipation(updated) });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }
      console.error("[POST /api/bounties/:id/steps/:stepId/visit]", e);
      res.status(500).json({ error: "Failed to record step visit" });
    }
  })
);

router.post(
  "/:id/steps/:stepId/claim",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);
    const stepId = getRouteParam(req.params.stepId);

    try {
      const body = authSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(body);
      const loaded = await loadActiveParticipation(id, wallet);
      if ("error" in loaded) {
        const code = loaded.error;
        if (code === "not_found") res.status(404).json({ error: "Quest not found" });
        else if (code === "inactive") res.status(400).json({ error: "Quest is not active" });
        else res.status(400).json({ error: "Join the quest first" });
        return;
      }

      const { bounty, participation } = loaded;
      const steps = resolveQuestSteps(bounty);
      const step = steps.find((s) => s.id === stepId);
      if (!step) {
        res.status(400).json({ error: "Invalid quest step" });
        return;
      }

      const proof = parseStepProof(participation.proofJson);
      const entry = proof.stepProgress?.[stepId];
      if (!entry?.visitedAt) {
        res.status(400).json({ error: "Complete the action before claiming this step" });
        return;
      }
      if (entry.claimedAt) {
        res.json({ ok: true, participation: mapParticipation(participation), alreadyClaimed: true });
        return;
      }

      if (step.kind === "social") {
        const verification = await verifySocialBountyStep(wallet, step);
        if (!verification.verified) {
          const stepProgress = { ...(proof.stepProgress ?? {}) };
          stepProgress[stepId] = {
            ...entry,
            verifyError: verification.reason ?? "Social task not verified",
          };
          const failed = await prisma.bountyParticipation.update({
            where: { id: participation.id },
            data: {
              proofJson: mergeStepProof(participation.proofJson, { stepProgress }) as Prisma.InputJsonValue,
            },
          });
          res.status(400).json({
            error: verification.reason ?? "Social task not verified — complete it on the platform first",
            participation: mapParticipation(failed),
          });
          return;
        }
      }

      const stepProgress = { ...(proof.stepProgress ?? {}) };
      stepProgress[stepId] = {
        ...entry,
        verifiedAt: step.kind === "social" ? new Date().toISOString() : entry.verifiedAt,
        verifyError: undefined,
        claimedAt: new Date().toISOString(),
      };

      const updated = await prisma.bountyParticipation.update({
        where: { id: participation.id },
        data: {
          proofJson: mergeStepProof(participation.proofJson, { stepProgress }) as Prisma.InputJsonValue,
        },
      });

      res.json({
        ok: true,
        participation: mapParticipation(updated),
        stepXp: stepXpPoints(step),
        allStepsClaimed: allStepsClaimed(steps, parseStepProof(updated.proofJson)),
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
      console.error("[POST /api/bounties/:id/steps/:stepId/claim]", e);
      res.status(500).json({ error: "Failed to claim step" });
    }
  })
);

router.post(
  "/:id/claim-xp",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const body = authSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(body);
      const loaded = await loadActiveParticipation(id, wallet);
      if ("error" in loaded) {
        const code = loaded.error;
        if (code === "not_found") res.status(404).json({ error: "Quest not found" });
        else if (code === "inactive") res.status(400).json({ error: "Quest is not active" });
        else res.status(400).json({ error: "Join the quest first" });
        return;
      }

      const { bounty, participation } = loaded;
      const steps = resolveQuestSteps(bounty);
      const proof = parseStepProof(participation.proofJson);

      if (participation.xpAwarded > 0 || proof.xpClaimedAt) {
        res.status(409).json({ error: "XP already claimed for this quest" });
        return;
      }

      if (!allStepsClaimed(steps, proof)) {
        res.status(400).json({ error: "Complete and claim every step before collecting XP" });
        return;
      }

      if (!allSocialStepsVerified(steps, proof)) {
        res.status(400).json({
          error: "All social tasks must be verified before collecting XP",
        });
        return;
      }

      for (const step of steps) {
        if (step.kind !== "social") continue;
        const verification = await verifySocialBountyStep(wallet, step);
        if (!verification.verified) {
          res.status(400).json({
            error: verification.reason ?? `Could not verify: ${step.instruction}`,
          });
          return;
        }
      }

      const xpTotal = totalQuestXp(steps);
      if (xpTotal <= 0) {
        res.status(400).json({ error: "This quest has no XP reward" });
        return;
      }

      const hasBonus = hasOnchainBonusReward(bounty.rewardType, bounty.rewardAmount);
      const nextStatus = hasBonus ? "VERIFIED" : "CLAIMED";

      const updated = await prisma.bountyParticipation.update({
        where: { id: participation.id },
        data: {
          status: nextStatus,
          verifiedAt: new Date(),
          verifiedBy: "system:steps",
          claimedAt: hasBonus ? undefined : new Date(),
          proofJson: mergeStepProof(participation.proofJson, {
            xpClaimedAt: new Date().toISOString(),
          }) as Prisma.InputJsonValue,
        },
      });

      const xpEarned = await awardBountyCompletionXp(updated.id, { xpAmount: xpTotal });

      res.json({
        ok: true,
        participation: mapParticipation(
          await prisma.bountyParticipation.findUniqueOrThrow({ where: { id: participation.id } })
        ),
        xpEarned,
        hasOnchainBonus: hasBonus,
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
      console.error("[POST /api/bounties/:id/claim-xp]", e);
      res.status(500).json({ error: "Failed to claim XP" });
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

      if (participation.status === "CLAIMED") {
        res.status(409).json({ error: "Quest already completed" });
        return;
      }

      const hasBonus = hasOnchainBonusReward(bounty.rewardType, bounty.rewardAmount);
      if (
        participation.status === "VERIFIED" &&
        !(bounty.verificationMethod === "ONCHAIN" && hasBonus && participation.xpAwarded > 0)
      ) {
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

        const alreadyVerified = participation.status === "VERIFIED";
        const updated = await prisma.bountyParticipation.update({
          where: { id: participation.id },
          data: {
            status: alreadyVerified ? "VERIFIED" : "VERIFIED",
            proofJson: {
              ...parseStepProof(participation.proofJson),
              ...proof,
              onchain: result.details,
            } as Prisma.InputJsonValue,
            verifiedAt: participation.verifiedAt ?? new Date(),
            verifiedBy: alreadyVerified ? participation.verifiedBy : "system:onchain",
            rejectionReason: null,
          },
        });

        const xpEarned =
          updated.xpAwarded > 0 ? updated.xpAwarded : await awardBountyCompletionXp(updated.id);

        res.json({
          ok: true,
          participation: mapParticipation({ ...updated, xpAwarded: xpEarned || updated.xpAwarded }),
          autoVerified: true,
          xpEarned: alreadyVerified ? 0 : xpEarned,
        });
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

      let xpEarned = 0;
      if (body.approve) {
        xpEarned = await awardBountyCompletionXp(updated.id);
      }

      res.json({
        ok: true,
        participation: mapParticipation({ ...updated, xpAwarded: xpEarned || updated.xpAwarded }),
        xpEarned,
      });
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

router.get(
  "/:id/quiz",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const bounty = await prisma.bounty.findUnique({ where: { id } });
      if (!bounty) {
        res.status(404).json({ error: "Quest not found" });
        return;
      }
      if (bounty.verificationMethod !== "QUIZ") {
        res.status(400).json({ error: "This quest is not a quiz" });
        return;
      }

      const quiz = await getQuizByBountyId(prisma, id);
      if (!quiz) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }

      res.json({ quiz: mapPublicQuiz(quiz) });
    } catch (e) {
      console.error("[GET /api/bounties/:id/quiz]", e);
      res.status(500).json({ error: "Failed to load quiz" });
    }
  })
);

router.post(
  "/:id/quiz/submit",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const body = quizSubmitSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth(body);

      const bounty = await prisma.bounty.findUnique({ where: { id } });
      if (!bounty) {
        res.status(404).json({ error: "Quest not found" });
        return;
      }
      if (bounty.verificationMethod !== "QUIZ") {
        res.status(400).json({ error: "This quest is not a quiz" });
        return;
      }
      if (resolveEffectiveStatus(bounty) !== "active") {
        res.status(400).json({ error: "Quest is not active" });
        return;
      }

      const quiz = await getQuizByBountyId(prisma, id);
      if (!quiz) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }

      const participation = await prisma.bountyParticipation.findUnique({
        where: { bountyId_walletAddress: { bountyId: id, walletAddress: wallet } },
      });

      if (!participation) {
        res.status(400).json({ error: "Join the quest before taking the quiz" });
        return;
      }

      if (participation.status === "CLAIMED") {
        res.status(409).json({ error: "Reward already claimed" });
        return;
      }

      if (participation.status === "VERIFIED") {
        res.status(409).json({ error: "Quiz already passed — claim your reward" });
        return;
      }

      if (quiz.oneRewardPerWallet) {
        const priorPass = await prisma.quizAttempt.findFirst({
          where: { bountyId: id, walletAddress: wallet, passed: true },
        });
        if (priorPass) {
          res.status(409).json({ error: "You already passed this quiz" });
          return;
        }
      }

      const normalizedAnswers: Record<string, string> = {};
      for (const [questionId, answer] of Object.entries(body.answers)) {
        normalizedAnswers[questionId] = answer.toUpperCase();
      }

      for (const question of quiz.questions) {
        if (!normalizedAnswers[question.id]) {
          res.status(400).json({ error: "Answer every question before submitting" });
          return;
        }
      }

      const { results, score, passed } = gradeQuizAttempt(quiz, normalizedAnswers);
      const totalQuestions = quiz.questions.length;

      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          bountyId: id,
          walletAddress: wallet,
          answersJson: normalizedAnswers,
          resultsJson: results,
          score,
          totalQuestions,
          passed,
        },
      });

      let participationStatus: string = participation.status;

      if (passed) {
        const now = new Date().toISOString();
        const stepProgress = {
          ...(parseStepProof(participation.proofJson).stepProgress ?? {}),
          [QUIZ_STEP_ID]: { visitedAt: now, claimedAt: now },
        };
        await prisma.bountyParticipation.update({
          where: { id: participation.id },
          data: {
            proofJson: {
              ...mergeStepProof(participation.proofJson, { stepProgress }),
              quizAttemptId: attempt.id,
              score,
              totalQuestions,
            } as Prisma.InputJsonValue,
            rejectionReason: null,
          },
        });
        participationStatus = participation.status;
        res.json({
          ok: true,
          result: buildSubmitResult({
            passed,
            score,
            totalQuestions,
            results,
            unlimitedAttempts: quiz.unlimitedAttempts,
            participationStatus,
          }),
          participation: mapParticipation(
            await prisma.bountyParticipation.findUniqueOrThrow({ where: { id: participation.id } })
          ),
          quizStepClaimed: true,
        });
        return;
      } else if (!quiz.unlimitedAttempts) {
        await prisma.bountyParticipation.update({
          where: { id: participation.id },
          data: {
            status: "REJECTED",
            rejectionReason: `Quiz failed: ${score}/${totalQuestions} correct`,
            proofJson: { quizAttemptId: attempt.id, score, totalQuestions } as Prisma.InputJsonValue,
          },
        });
        participationStatus = "REJECTED";
      } else {
        await prisma.bountyParticipation.update({
          where: { id: participation.id },
          data: {
            proofJson: { quizAttemptId: attempt.id, score, totalQuestions, lastFailedAt: new Date().toISOString() } as Prisma.InputJsonValue,
          },
        });
      }

      res.json({
        ok: true,
        result: buildSubmitResult({
          passed,
          score,
          totalQuestions,
          results,
          unlimitedAttempts: quiz.unlimitedAttempts,
          participationStatus,
        }),
        participation: mapParticipation(
          await prisma.bountyParticipation.findUniqueOrThrow({ where: { id: participation.id } })
        ),
      });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid quiz submission" });
        return;
      }
      console.error("[POST /api/bounties/:id/quiz/submit]", e);
      res.status(500).json({ error: "Failed to submit quiz" });
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
        res.status(400).json({ error: "Complete XP claim before claiming the on-chain bonus" });
        return;
      }

      if (!hasOnchainBonusReward(participation.bounty.rewardType, participation.bounty.rewardAmount)) {
        res.status(400).json({ error: "This quest has no on-chain bonus reward" });
        return;
      }

      if (participation.xpAwarded <= 0) {
        res.status(400).json({ error: "Claim your XP before claiming the on-chain bonus" });
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
        onchain: true,
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
