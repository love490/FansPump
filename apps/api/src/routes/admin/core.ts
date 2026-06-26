import { Router } from "express";
import { z } from "zod";
import type { AdminRole } from "@iopn/database";
import { isAddress } from "viem";
import { AdminAuthError } from "../../lib/admin-auth";
import { isAdminWallet, getFactoryAdminAddress } from "../../lib/admin";
import { getAdminOverview } from "../../lib/admin/overview";
import {
  createAdminAccount,
  listAdmins,
  setAdminRoleById,
  getRolePermissions,
} from "../../lib/admin/roles";
import {
  adminEmailSchema,
  adminPasswordSchema,
  hashAdminPassword,
  normalizeAdminEmail,
} from "../../lib/admin/password";
import { weiToOpnFloat } from "../../lib/analytics/fee-split";
import prisma from "../../lib/prisma";
import { asyncHandler, queryToSearchParams } from "../../lib/http-helpers";
import {
  requireAdminSession,
  requireAdminSessionWithCsrf,
  requirePermission,
} from "../../lib/admin/express-api-auth";
import { logAdminAction, getActivityLogs } from "../../lib/admin/express-audit";
import { handleAdminError } from "../../lib/admin/handle-error";
import { zodErrorMessage } from "../../lib/admin/zod-error";
import { ensureCreatorProfile } from "../../lib/v2/reputation";
import { roleHasPermission } from "../../lib/admin/roles";

const router = Router();

const adminCreateSchema = z.object({
  email: adminEmailSchema,
  password: adminPasswordSchema,
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR"]),
});

const adminPatchSchema = z.object({
  adminId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR"]),
});

const rolePatchSchema = z.object({
  adminId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT", "VIEWER"]),
});

const verificationPatchSchema = z.object({
  tokenId: z.string(),
  action: z.enum(["approve", "reject", "revoke", "submit"]),
});

router.get(
  "/check",
  asyncHandler(async (_req, res) => {
    res.json({
      isAdmin: false,
      message:
        "Wallet admin check is deprecated. Platform admins sign in at /admin/login with email and password.",
    });
  })
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    try {
      const { admin, csrfToken } = await requireAdminSession(req);
      res.json({
        email: admin.email,
        role: admin.role,
        permissions: getRolePermissions(admin.role),
        csrfToken,
        twoFactorEnabled: admin.twoFactorEnabled,
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed" });
    }
  })
);

router.get(
  "/authorize",
  asyncHandler(async (_req, res) => {
    res.status(410).json({
      error:
        "Wallet-based admin authentication has been replaced. Use /admin/login with email and password.",
    });
  })
);

router.post(
  "/authorize",
  asyncHandler(async (_req, res) => {
    res.status(410).json({
      error:
        "Wallet-based admin authentication has been replaced. Use POST /api/admin/auth/login.",
    });
  })
);

router.get(
  "/factory-admin",
  asyncHandler(async (req, res) => {
    const wallet = queryToSearchParams(req.query).get("wallet")?.toLowerCase();
    if (!wallet) {
      res.json({ isFactoryAdmin: false });
      return;
    }

    const factoryAdmin = getFactoryAdminAddress();
    const isFactoryAdmin = factoryAdmin
      ? wallet === factoryAdmin
      : isAdminWallet(wallet);

    res.json({ isFactoryAdmin });
  })
);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    try {
      await requireAdminSession(req);

      const [tokenCount, userCount, featuredCount, verificationCount, voteCount] =
        await Promise.all([
          prisma.tokenProject.count(),
          prisma.user.count(),
          prisma.tokenProject.count({ where: { isFeatured: true } }),
          prisma.creatorVerification.count(),
          prisma.tokenVote.count(),
        ]);

      const recentTokens = await prisma.tokenProject.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          name: true,
          symbol: true,
          contractAddress: true,
          createdAt: true,
        },
      });

      res.json({
        stats: {
          tokenCount,
          userCount,
          featuredCount,
          verificationCount,
          voteCount,
        },
        recentTokens,
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load stats" });
    }
  })
);

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    try {
      await requireAdminSession(req);
      const overview = await getAdminOverview();
      res.json({ overview });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      console.error("[GET /api/admin/overview]", e);
      res.status(500).json({ error: "Failed to load overview" });
    }
  })
);

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "analytics", "GET");
      const format = queryToSearchParams(req.query).get("format");
      const overview = await getAdminOverview();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [trades24h, topTokens, creatorEarningRows, treasury] = await Promise.all([
        prisma.swapActivity.count({ where: { blockTime: { gte: since24h } } }),
        prisma.tokenProject.findMany({
          orderBy: { volumeTotal: "desc" },
          take: 10,
          select: {
            name: true,
            symbol: true,
            contractAddress: true,
            volumeTotal: true,
            volume24h: true,
          },
        }),
        prisma.creatorEarning.findMany({
          select: { creatorAddress: true, amount: true },
        }),
        prisma.platformTreasuryLedger.findUnique({ where: { id: "global" } }),
      ]);

      const creatorTotals = new Map<string, bigint>();
      for (const row of creatorEarningRows) {
        const key = row.creatorAddress.toLowerCase();
        creatorTotals.set(key, (creatorTotals.get(key) ?? 0n) + BigInt(row.amount));
      }
      const topCreators = [...creatorTotals.entries()]
        .map(([creator, total]) => ({
          creator,
          earningsOpn: weiToOpnFloat(total),
        }))
        .sort((a, b) => b.earningsOpn - a.earningsOpn)
        .slice(0, 10);

      const analytics = {
        totalVolume: overview.totalTradingVolume,
        volume24h: overview.volume24h,
        volume7d: overview.volume7d,
        totalTrades: overview.latestTransactions.length,
        trades24h,
        topTokens,
        topCreators,
        revenueBreakdown: {
          platformTreasuryOpn: treasury ? weiToOpnFloat(BigInt(treasury.totalWei)) : 0,
          creatorEarningsOpn: overview.totalCreatorEarnings,
        },
      };

      if (format === "csv") {
        const rows = [
          ["Metric", "Value"],
          ["Total Volume", String(analytics.totalVolume)],
          ["24h Volume", String(analytics.volume24h)],
          ["7d Volume", String(analytics.volume7d)],
          ["24h Trades", String(analytics.trades24h)],
          ["Platform Revenue", String(analytics.revenueBreakdown.platformTreasuryOpn)],
          ["Creator Earnings", String(analytics.revenueBreakdown.creatorEarningsOpn)],
          [],
          ["Top Tokens", "Symbol", "Volume Total"],
          ...topTokens.map((t) => [t.name, t.symbol, String(t.volumeTotal)]),
        ];
        const csv = rows.map((r) => r.join(",")).join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="fanspump-analytics.csv"'
        );
        res.send(csv);
        return;
      }

      res.json({ analytics });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load analytics" });
    }
  })
);

router.get(
  "/activity-logs",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "activity_logs", "GET");
      const params = queryToSearchParams(req.query);
      const limit = Number(params.get("limit") ?? 50);
      const offset = Number(params.get("offset") ?? 0);
      const { logs, total } = await getActivityLogs(limit, offset);
      res.json({
        logs: logs.map((l) => ({
          id: l.id,
          admin: l.adminEmail,
          action: l.action,
          details: l.details,
          ipAddress: l.ipAddress,
          timestamp: l.createdAt.toISOString(),
        })),
        total,
      });
    } catch (e) {
      handleAdminError(res, e, "Failed to load logs");
    }
  })
);

router.get(
  "/admins",
  asyncHandler(async (req, res) => {
    try {
      const { role } = await requirePermission(req, "roles", "GET");
      if (role !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Super admin only" });
        return;
      }
      const admins = await listAdmins();
      res.json({ admins });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load admins" });
    }
  })
);

router.post(
  "/admins",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requirePermission(req, "roles", "POST");
      if (ctx.role !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Super admin only" });
        return;
      }

      const body = adminCreateSchema.parse(ctx.parsedBody);
      const email = normalizeAdminEmail(body.email);
      const passwordHash = await hashAdminPassword(body.password);
      const admin = await createAdminAccount(
        email,
        passwordHash,
        body.role as AdminRole
      );

      await logAdminAction(
        ctx.email,
        "ADMIN_CREATED",
        { targetEmail: email, role: body.role },
        req,
        ctx.admin.id
      );

      res.json({ ok: true, admin });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
        return;
      }
      if (e instanceof Error && e.message.includes("Unique constraint")) {
        res.status(409).json({ error: "An admin with this email already exists" });
        return;
      }
      res.status(500).json({ error: "Create failed" });
    }
  })
);

router.patch(
  "/admins",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requirePermission(req, "roles", "PATCH");
      if (ctx.role !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Super admin only" });
        return;
      }

      const { adminId, role } = adminPatchSchema.parse(ctx.parsedBody);
      await setAdminRoleById(adminId, role as AdminRole);
      await logAdminAction(
        ctx.email,
        "ROLE_CHANGE",
        { adminId, role },
        req,
        ctx.admin.id
      );

      res.json({ ok: true });
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
  "/roles",
  asyncHandler(async (req, res) => {
    try {
      const { role } = await requirePermission(req, "roles", "GET");
      if (role !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Super admin only" });
        return;
      }
      const admins = await listAdmins();
      res.json({ admins });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load roles" });
    }
  })
);

router.patch(
  "/roles",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requirePermission(req, "roles", "PATCH");
      if (ctx.role !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Super admin only" });
        return;
      }
      const { adminId, role } = rolePatchSchema.parse(ctx.parsedBody);
      await setAdminRoleById(adminId, role as AdminRole);
      await logAdminAction(
        ctx.email,
        "ROLE_CHANGE",
        { adminId, role },
        req,
        ctx.admin.id
      );
      res.json({ ok: true });
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
  "/verification",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "verification", "GET");
      const status = queryToSearchParams(req.query).get("status");

      const tokens = await prisma.tokenProject.findMany({
        where:
          status && status !== "all"
            ? {
                verificationStatus: status.toUpperCase() as
                  | "PENDING"
                  | "APPROVED"
                  | "REJECTED"
                  | "REVOKED",
              }
            : { verificationStatus: { not: "NONE" } },
        orderBy: { verificationSubmittedAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          symbol: true,
          contractAddress: true,
          creatorAddress: true,
          verificationStatus: true,
          verificationSubmittedAt: true,
          createdAt: true,
        },
      });

      res.json({
        submissions: tokens.map((t) => ({
          tokenId: t.id,
          token: `${t.name} (${t.symbol})`,
          wallet: t.creatorAddress,
          contractAddress: t.contractAddress,
          status: t.verificationStatus,
          submittedAt:
            t.verificationSubmittedAt?.toISOString() ?? t.createdAt.toISOString(),
        })),
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load verifications" });
    }
  })
);

router.patch(
  "/verification",
  asyncHandler(async (req, res) => {
    try {
      const ctx = await requirePermission(req, "verification", "PATCH");
      const { tokenId, action } = verificationPatchSchema.parse(ctx.parsedBody);

      const statusMap = {
        approve: "APPROVED" as const,
        reject: "REJECTED" as const,
        revoke: "REVOKED" as const,
        submit: "PENDING" as const,
      };

      const token = await prisma.tokenProject.update({
        where: { id: tokenId },
        data: {
          verificationStatus: statusMap[action],
          verificationSubmittedAt: action === "submit" ? new Date() : undefined,
        },
      });

      await logAdminAction(
        ctx.email,
        "VERIFICATION_DECISION",
        { tokenId, action, status: statusMap[action] },
        req,
        ctx.admin.id
      );

      res.json({
        ok: true,
        token: { id: token.id, verificationStatus: token.verificationStatus },
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
  "/creator-verifications",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "verification", "GET");
      const rows = await prisma.creatorVerification.findMany({
        orderBy: { verifiedAt: "desc" },
        take: 100,
      });
      res.json({
        creators: rows.map((r) => ({
          walletAddress: r.walletAddress,
          verifiedAt: r.verifiedAt.toISOString(),
        })),
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load verifications" });
    }
  })
);

router.get(
  "/creator-earnings",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "creator_earnings", "GET");

      const earnings = await prisma.creatorEarning.findMany({
        select: { creatorAddress: true, tokenAddress: true, amount: true },
      });

      const grouped = new Map<
        string,
        { creator: string; tokenAddress: string; total: bigint }
      >();
      for (const e of earnings) {
        const key = `${e.creatorAddress}:${e.tokenAddress}`;
        const existing = grouped.get(key);
        const amount = BigInt(e.amount);
        if (existing) {
          existing.total += amount;
        } else {
          grouped.set(key, {
            creator: e.creatorAddress,
            tokenAddress: e.tokenAddress,
            total: amount,
          });
        }
      }

      const sorted = [...grouped.values()]
        .sort((a, b) =>
          a.total > b.total ? -1 : a.total < b.total ? 1 : 0
        )
        .slice(0, 100);

      const tokenAddresses = [...new Set(sorted.map((e) => e.tokenAddress))];
      const tokens = await prisma.tokenProject.findMany({
        where: { contractAddress: { in: tokenAddresses } },
        select: { contractAddress: true, name: true, symbol: true },
      });
      const tokenMap = new Map(tokens.map((t) => [t.contractAddress, t]));

      const rows = sorted.map((e) => {
        const accumulated = e.total;
        const token = tokenMap.get(e.tokenAddress);
        return {
          creator: e.creator,
          token: token ? `${token.name} (${token.symbol})` : e.tokenAddress,
          tokenAddress: e.tokenAddress,
          accumulatedEarnings: weiToOpnFloat(accumulated),
          claimedEarnings: 0,
          pendingEarnings: weiToOpnFloat(accumulated),
        };
      });

      res.json({ earnings: rows, readOnly: true });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load earnings" });
    }
  })
);

router.get(
  "/announcements",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "announcements", "GET");
      const limit = Math.min(
        Number(queryToSearchParams(req.query).get("limit") ?? 50),
        100
      );

      const announcements = await prisma.tokenAnnouncement.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { token: { select: { name: true, symbol: true } } },
      });

      res.json({
        announcements: announcements.map((a) => ({
          id: a.id,
          tokenAddress: a.tokenAddress,
          tokenName: a.token.name,
          tokenSymbol: a.token.symbol,
          creatorWallet: a.creatorWallet,
          title: a.title,
          content: a.content,
          type: a.type,
          isHidden: a.isHidden,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to load announcements" });
    }
  })
);

router.patch(
  "/announcements",
  asyncHandler(async (req, res) => {
    try {
      const { parsedBody } = await requirePermission(req, "announcements", "PATCH");
      const id = String(parsedBody.id ?? "");
      const isHidden = parsedBody.isHidden;
      const title = typeof parsedBody.title === "string" ? parsedBody.title.trim() : undefined;
      const content = typeof parsedBody.content === "string" ? parsedBody.content.trim() : undefined;

      if (!id) {
        res.status(400).json({ error: "id required" });
        return;
      }

      const data: { isHidden?: boolean; title?: string; content?: string } = {};
      if (typeof isHidden === "boolean") data.isHidden = isHidden;
      if (title !== undefined) {
        if (title.length < 3) {
          res.status(400).json({ error: "Title must be at least 3 characters" });
          return;
        }
        data.title = title;
      }
      if (content !== undefined) {
        if (content.length < 10) {
          res.status(400).json({ error: "Content must be at least 10 characters" });
          return;
        }
        data.content = content;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const announcement = await prisma.tokenAnnouncement.update({
        where: { id },
        data,
      });

      res.json({
        announcement: {
          ...announcement,
          createdAt: announcement.createdAt.toISOString(),
        },
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to update announcement" });
    }
  })
);

const announcementCreateSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(3).max(120),
  content: z.string().min(10).max(8000),
  type: z.enum([
    "VERSION_RELEASE",
    "PARTNERSHIP",
    "LIQUIDITY_ADDED",
    "EXCHANGE_LISTING",
    "MARKETING_UPDATE",
    "COMMUNITY_UPDATE",
    "GENERAL",
  ]),
  creatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

router.post(
  "/announcements",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "announcements", "POST");
      const body = announcementCreateSchema.parse(parsedBody);
      const tokenAddress = body.tokenAddress.toLowerCase();

      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: tokenAddress },
      });
      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }

      const creatorWallet = (body.creatorWallet ?? token.creatorAddress).toLowerCase();

      const announcement = await prisma.tokenAnnouncement.create({
        data: {
          tokenId: token.id,
          tokenAddress,
          creatorWallet,
          title: body.title.trim(),
          content: body.content.trim(),
          type: body.type,
        },
        include: { token: { select: { name: true, symbol: true } } },
      });

      await logAdminAction(
        email,
        "ANNOUNCEMENT_CREATED",
        { announcementId: announcement.id, tokenAddress },
        req,
        admin.id
      );

      res.json({
        announcement: {
          id: announcement.id,
          tokenAddress: announcement.tokenAddress,
          tokenName: announcement.token.name,
          tokenSymbol: announcement.token.symbol,
          creatorWallet: announcement.creatorWallet,
          title: announcement.title,
          type: announcement.type,
          isHidden: announcement.isHidden,
          createdAt: announcement.createdAt.toISOString(),
        },
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: zodErrorMessage(e) });
        return;
      }
      res.status(500).json({ error: "Failed to create announcement" });
    }
  })
);

router.delete(
  "/announcements",
  asyncHandler(async (req, res) => {
    try {
      const { admin } = await requireAdminSessionWithCsrf(req);
      if (
        !roleHasPermission(admin.role, "announcements") &&
        !roleHasPermission(admin.role, "write")
      ) {
        throw new AdminAuthError("Insufficient permissions");
      }

      const id = String((req.body as { id?: string })?.id ?? "");
      if (!id) {
        res.status(400).json({ error: "id required" });
        return;
      }

      await prisma.tokenAnnouncement.delete({ where: { id } });

      await logAdminAction(admin.email, "ANNOUNCEMENT_DELETED", { announcementId: id }, req, admin.id);

      res.json({ ok: true });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  })
);

router.get(
  "/v2",
  asyncHandler(async (req, res) => {
    try {
      await requirePermission(req, "v2_platform", "GET");

      const [creators, quests, snapshots, trustHistory] = await Promise.all([
        prisma.creatorProfile.findMany({
          orderBy: { reputationScore: "desc" },
          take: 50,
        }),
        prisma.creatorQuest.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { _count: { select: { completions: true } } },
        }),
        prisma.tokenDailySnapshot.count(),
        prisma.trustScoreHistory.count(),
      ]);

      res.json({
        creators,
        quests: quests.map((q) => ({
          ...q,
          completions: q._count.completions,
        })),
        analytics: {
          dailySnapshots: snapshots,
          trustHistoryEntries: trustHistory,
        },
      });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      throw e;
    }
  })
);

router.patch(
  "/v2",
  asyncHandler(async (req, res) => {
    try {
      const { email, admin, parsedBody } = await requirePermission(req, "v2_platform", "PATCH");
      const {
        walletAddress,
        status,
        isFeatured,
        questId,
        questStatus,
        createQuest,
        deleteQuestId,
      } = parsedBody as {
        walletAddress?: string;
        status?: string;
        isFeatured?: boolean;
        questId?: string;
        questStatus?: string;
        deleteQuestId?: string;
        createQuest?: {
          creatorWallet: string;
          title: string;
          description: string;
          questType: "SOCIAL" | "ENGAGEMENT" | "GROWTH" | "COMMUNITY";
          targetUrl?: string | null;
          tokenAddress?: string;
          rewardXp?: number;
          rewardReputation?: number;
        };
      };

      if (walletAddress) {
        if (!isAddress(walletAddress)) {
          res.status(400).json({ error: "Invalid wallet" });
          return;
        }
        const wallet = walletAddress.toLowerCase();
        await ensureCreatorProfile(wallet);
        await prisma.creatorProfile.upsert({
          where: { walletAddress: wallet },
          create: {
            walletAddress: wallet,
            status: (status as "ANONYMOUS" | "VERIFIED" | "TRUSTED") ?? "ANONYMOUS",
            isFeatured: !!isFeatured,
          },
          update: {
            ...(status
              ? { status: status as "ANONYMOUS" | "VERIFIED" | "TRUSTED" }
              : {}),
            ...(typeof isFeatured === "boolean" ? { isFeatured } : {}),
          },
        });
      }

      if (createQuest) {
        const wallet = createQuest.creatorWallet.toLowerCase();
        if (!isAddress(wallet)) {
          res.status(400).json({ error: "Invalid creator wallet" });
          return;
        }
        await ensureCreatorProfile(wallet);

        let tokenId: string | null = null;
        let tokenAddress: string | null = null;
        if (createQuest.tokenAddress) {
          if (!isAddress(createQuest.tokenAddress)) {
            res.status(400).json({ error: "Invalid token address" });
            return;
          }
          const token = await prisma.tokenProject.findUnique({
            where: { contractAddress: createQuest.tokenAddress.toLowerCase() },
          });
          if (!token) {
            res.status(404).json({ error: "Token not found" });
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
            questType: createQuest.questType,
            title: createQuest.title.trim(),
            description: createQuest.description.trim(),
            targetUrl: createQuest.targetUrl ?? null,
            rewardXp: createQuest.rewardXp ?? 10,
            rewardReputation: createQuest.rewardReputation ?? 5,
          },
        });

        await logAdminAction(
          email,
          "QUEST_CREATED",
          { questId: quest.id, title: quest.title },
          req,
          admin.id
        );
      }

      if (questId && questStatus) {
        await prisma.creatorQuest.update({
          where: { id: questId },
          data: { status: questStatus as "ACTIVE" | "PAUSED" | "COMPLETED" },
        });
      }

      if (deleteQuestId) {
        await prisma.creatorQuest.delete({ where: { id: deleteQuestId } });
        await logAdminAction(
          email,
          "QUEST_DELETED",
          { questId: deleteQuestId },
          req,
          admin.id
        );
      }

      res.json({ ok: true });
    } catch (e) {
      if (e instanceof AdminAuthError) {
        res.status(401).json({ error: e.message });
        return;
      }
      throw e;
    }
  })
);

export default router;


