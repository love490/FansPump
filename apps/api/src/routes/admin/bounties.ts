import { Router } from "express";
import { isAddress } from "viem";
import { z } from "zod";
import {
  bountyListInclude,
  mapBountyRow,
} from "../../lib/bounties";
import {
  mergeBountyVerificationConfig,
  resolvePrimaryTaskType,
  validateBountyTaskSelection,
  type SocialBountyActionId,
} from "../../lib/bounty-task-config";
import { createQuizForBounty } from "../../lib/quiz/service";
import { quizInputSchema } from "../../lib/quiz/schemas";
import { validateQuizInput } from "../../lib/quiz/validate";
import { ensureCreatorProfile } from "../../lib/v2/reputation";
import { AdminAuthError } from "../../lib/admin-auth";
import { roleHasPermission } from "../../lib/admin/roles";
import prisma from "../../lib/prisma";
import { asyncHandler, getRouteParam } from "../../lib/http-helpers";
import { requireAdminSessionWithCsrf, requirePermission } from "../../lib/admin/express-api-auth";
import { logAdminAction } from "../../lib/admin/express-audit";
import { handleAdminError } from "../../lib/admin/handle-error";
import { zodErrorMessage } from "../../lib/admin/zod-error";
import { getPlatformCreatorWallet } from "../../lib/admin";
import { composeBountyQuest } from "../../lib/bounties/quest-compose";
import { sumStepXpPoints } from "../../lib/bounties/step-progress";

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
});

const verificationConfigSchema = z
  .object({
    taskTypes: z.array(taskTypeEnum).optional(),
    socialActions: z.array(socialActionEnum).optional(),
    taskSteps: z.array(taskStepSchema).optional(),
  })
  .optional()
  .nullable();

const createSchema = z.object({
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  taskType: taskTypeEnum,
  taskTypes: z.array(taskTypeEnum).min(1).optional(),
  socialActions: z.array(socialActionEnum).optional(),
  verificationConfig: verificationConfigSchema,
  requirements: z.string().max(2000).optional().nullable(),
  rewardType: z.enum(["OPN", "TOKEN", "CUSTOM", "XP"]),
  rewardAmount: z.string().min(1).max(64),
  rewardDescription: z.string().max(200).optional().nullable(),
  xpReward: z.number().int().min(0).max(100000).optional(),
  maxParticipants: z.number().int().min(1).max(10000).optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  tokenAddress: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
  verificationMethod: z.enum(["MANUAL", "ONCHAIN", "API", "QUIZ"]).optional(),
  quiz: quizInputSchema.optional(),
  quizXpPoints: z.number().int().min(1).max(10000).optional(),
});

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "ENDED", "COMPLETED", "CANCELLED"]).optional(),
  isFeatured: z.boolean().optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(4000).optional(),
  maxParticipants: z.number().int().min(1).max(10000).nullable().optional(),
  endsAt: z.string().datetime().optional().nullable(),
});

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "earn", "GET");

      const bounties = await prisma.bounty.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: bountyListInclude,
      });

      res.json({ bounties: bounties.map(mapBountyRow) });
    } catch (e) {
      handleAdminError(res, e, "Failed to load bounties");
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "earn", "POST");
      const body = createSchema.parse(parsedBody);
      const wallet = (body.creatorWallet ?? getPlatformCreatorWallet())?.toLowerCase();

      if (!wallet || !isAddress(wallet)) {
        res.status(400).json({
          error: "Platform creator wallet is not configured. Set PLATFORM_CREATOR_WALLET or ADMIN_WALLET_ADDRESSES.",
        });
        return;
      }

      await ensureCreatorProfile(wallet);
      await prisma.user.upsert({
        where: { walletAddress: wallet },
        create: { walletAddress: wallet },
        update: {},
      });

      let tokenId: string | undefined;
      let tokenAddress: string | undefined;
      if (body.tokenAddress) {
        if (!isAddress(body.tokenAddress)) {
          res.status(400).json({ error: "Invalid token address" });
          return;
        }
        const token = await prisma.tokenProject.findUnique({
          where: { contractAddress: body.tokenAddress.toLowerCase() },
        });
        if (!token) {
          res.status(404).json({ error: "Token not found" });
          return;
        }
        tokenId = token.id;
        tokenAddress = token.contractAddress;
      }

      if (body.rewardType === "TOKEN") {
        const symbol = body.rewardDescription?.trim();
        if (!tokenAddress && !symbol) {
          res.status(400).json({ error: "Enter a token symbol (e.g. WIF, MAGO) or a token address" });
          return;
        }
      }

      const socialActions = (body.socialActions ?? []) as SocialBountyActionId[];
      const taskSteps = body.verificationConfig?.taskSteps ?? [];
      const hasQuiz = Boolean(body.quiz);
      const verificationMethodInput = body.verificationMethod ?? "MANUAL";

      if (hasQuiz && body.quiz) {
        const quizError = validateQuizInput(body.quiz);
        if (quizError) {
          res.status(400).json({ error: quizError });
          return;
        }
        if (!body.quizXpPoints || body.quizXpPoints < 1) {
          res.status(400).json({ error: "Set XP points for the quiz (1 or more)" });
          return;
        }
      }

      const taskError = validateBountyTaskSelection(socialActions, taskSteps, { hasQuiz });
      if (taskError) {
        res.status(400).json({ error: taskError });
        return;
      }

      const composed = composeBountyQuest({
        socialActions,
        taskSteps,
        quizXpPoints: body.quizXpPoints,
        hasQuiz,
        baseVerificationMethod: verificationMethodInput,
        existingConfig: body.verificationConfig,
      });

      const verificationMethod = composed.verificationMethod;
      const primaryTaskType = composed.primaryTaskType;
      const verificationConfig = composed.verificationConfig;
      const xpReward = composed.xpReward;

      if (xpReward < 1) {
        res.status(400).json({ error: "Set XP points on each task step (1 or more)" });
        return;
      }

      const taskTypes = composed.taskTypes;
      const endsAt = body.endsAt ? new Date(body.endsAt) : null;

      const bounty = await prisma.$transaction(async (tx) => {
        const row = await tx.bounty.create({
          data: {
            creatorWallet: wallet,
            tokenId,
            tokenAddress,
            title: body.title.trim(),
            description: body.description.trim(),
            taskType: primaryTaskType,
            requirements: body.requirements?.trim() || null,
            rewardType: body.rewardType,
            rewardAmount: body.rewardAmount.trim(),
            rewardDescription: body.rewardDescription?.trim() || null,
            xpReward,
            verificationMethod,
            verificationConfig: verificationConfig ?? undefined,
            maxParticipants: body.maxParticipants ?? null,
            isFeatured: body.isFeatured ?? false,
            endsAt,
          },
        });

        if (hasQuiz && body.quiz) {
          await createQuizForBounty(tx, row.id, body.quiz);
        }

        return tx.bounty.findUniqueOrThrow({
          where: { id: row.id },
          include: bountyListInclude,
        });
      });

      await logAdminAction(
        email,
        "BOUNTY_CREATED",
        { bountyId: bounty.id, title: bounty.title },
        req,
        admin.id
      );

      res.json({ bounty: mapBountyRow(bounty) });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: zodErrorMessage(e) });
        return;
      }
      handleAdminError(res, e, "Failed to create bounty");
    }
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const { email, admin, parsedBody } = await requirePermission(req, "earn", "PATCH");
      const body = patchSchema.parse(parsedBody);

      const bounty = await prisma.bounty.update({
        where: { id },
        data: {
          status: body.status,
          isFeatured: body.isFeatured,
          title: body.title?.trim(),
          description: body.description?.trim(),
          maxParticipants: body.maxParticipants ?? null,
          endsAt: body.endsAt === undefined ? undefined : body.endsAt ? new Date(body.endsAt) : null,
          ...(body.status === "COMPLETED" ? { completedAt: new Date() } : {}),
        },
        include: bountyListInclude,
      });

      await logAdminAction(
        email,
        "BOUNTY_UPDATED",
        { bountyId: id, changes: body },
        req,
        admin.id
      );

      res.json({ bounty: mapBountyRow(bounty) });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: zodErrorMessage(e) });
        return;
      }
      handleAdminError(res, e, "Failed to update bounty");
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = getRouteParam(req.params.id);

    try {
      const { admin } = await requireAdminSessionWithCsrf(req);
      if (!roleHasPermission(admin.role, "earn")) {
        throw new AdminAuthError("Insufficient permissions");
      }

      await prisma.bounty.delete({ where: { id } });

      await logAdminAction(admin.email, "BOUNTY_DELETED", { bountyId: id }, req, admin.id);

      res.json({ ok: true });
    } catch (e) {
      handleAdminError(res, e, "Failed to delete bounty");
    }
  })
);

export default router;
