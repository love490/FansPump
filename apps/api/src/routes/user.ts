import { Router } from "express";
import { isAddress } from "viem";
import { z } from "zod";
import { isValidUsername, normalizeUsername } from "@/lib/username";
import { formatBountyReward } from "@/lib/bounties";
import { getCreatorEarningsTotal } from "@/lib/analytics/queries";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";
import {
  formatActivityAmount,
  sortActivities,
  type UserActivity,
} from "@/lib/dashboard/activities";
import { consolidateStakingPositions } from "@/lib/staking/consolidate";
import { serializeStakingPosition } from "@/lib/staking/config";
import { getUnclaimedLaunchpoolRewards, markLaunchpoolRewardsClaimed } from "@/lib/launchpool/rewards";
import { getPlatformSetting, DEFAULT_SECURITY } from "@/lib/admin/platform-settings";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { formatUnits } from "viem";
import prisma from "../lib/prisma";
import { isMissingTableError, safeQuery } from "../lib/db-errors";
import { asyncHandler, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

const updateSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  username: z.string().max(24).optional(),
  profileImageUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});

const walletSchema = z.string().regex(/^0x[a-f0-9]{40}$/i);

const followSchema = z.object({
  walletAddress: walletSchema,
  creatorWallet: walletSchema,
});

const CLAIM_PREFIX = "FansPump Claim Rewards";

const claimSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const wallet = queryToSearchParams(req.query).get("wallet")?.trim().toLowerCase() ?? "";
    if (!wallet || !isAddress(wallet)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      select: { walletAddress: true, username: true, profileImageUrl: true },
    });

    res.json({
      profile: {
        walletAddress: wallet,
        username: user?.username ?? null,
        profileImageUrl: user?.profileImageUrl ?? null,
      },
    });
  })
);

router.patch(
  "/profile",
  asyncHandler(async (req, res) => {
    try {
      const body = updateSchema.parse(req.body);
      const wallet = body.walletAddress.toLowerCase();

      const data: { username?: string | null; profileImageUrl?: string | null } = {};

      if (body.username !== undefined) {
        const raw = normalizeUsername(body.username);
        if (!raw) {
          data.username = null;
        } else {
          if (!isValidUsername(raw)) {
            res.status(400).json({
              error: "Username must be 3–24 characters (letters, numbers, underscore only)",
            });
            return;
          }

          const taken = await prisma.user.findFirst({
            where: {
              username: { equals: raw, mode: "insensitive" },
              NOT: { walletAddress: wallet },
            },
            select: { walletAddress: true },
          });

          if (taken) {
            res.status(409).json({ error: "Username is already taken" });
            return;
          }

          data.username = raw;
        }
      }

      if (body.profileImageUrl !== undefined) {
        data.profileImageUrl = body.profileImageUrl || null;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: "No profile fields to update" });
        return;
      }

      const user = await prisma.user.upsert({
        where: { walletAddress: wallet },
        create: { walletAddress: wallet, ...data },
        update: data,
        select: { walletAddress: true, username: true, profileImageUrl: true },
      });

      res.json({ profile: user });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }
      console.error("[PATCH /api/user/profile]", e);
      res.status(500).json({ error: "Failed to update profile" });
    }
  })
);

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const wallet = queryToSearchParams(req.query).get("wallet")?.toLowerCase();
    if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
      res.status(400).json({ error: "wallet required" });
      return;
    }

    try {
      try {
        await consolidateStakingPositions(wallet);
      } catch (consolidateError) {
        console.warn("[GET /api/user/dashboard] consolidateStakingPositions failed:", consolidateError);
      }

      const walletMatch = { equals: wallet, mode: "insensitive" as const };

      const [
        tokensCreatedRows,
        liquidityLocks,
        lpBurnRows,
        bountiesCreatedRows,
        joinedQuests,
        completedParticipations,
        stakingRows,
        launchpoolStakeRows,
      ] = await Promise.all([
        safeQuery("tokensCreated", () =>
          prisma.tokenProject.findMany({
            where: { creatorAddress: walletMatch },
            select: { id: true, symbol: true, name: true, contractAddress: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          []
        ),
        safeQuery("liquidityLocks", () =>
          prisma.liquidityLock.findMany({
            where: { creatorWallet: walletMatch },
            include: { token: { select: { symbol: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          []
        ),
        safeQuery("lpBurns", () =>
          prisma.lpBurn.findMany({
            where: { creatorWallet: walletMatch },
            include: { token: { select: { symbol: true, contractAddress: true } } },
            orderBy: { burnedAt: "desc" },
            take: 50,
          }),
          []
        ),
        safeQuery("bountiesCreated", () =>
          prisma.bounty.findMany({
            where: { creatorWallet: walletMatch },
            select: { id: true, title: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          []
        ),
        safeQuery("joinedQuests", () =>
          prisma.bountyParticipation.findMany({
            where: { walletAddress: walletMatch },
            include: {
              bounty: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  createdAt: true,
                  rewardType: true,
                  rewardAmount: true,
                  rewardDescription: true,
                  token: { select: { symbol: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          []
        ),
        safeQuery("completedQuests", () =>
          prisma.bountyParticipation.findMany({
            where: {
              walletAddress: walletMatch,
              bounty: { status: "COMPLETED" },
            },
            include: {
              bounty: {
                select: {
                  id: true,
                  title: true,
                  completedAt: true,
                  rewardType: true,
                  rewardAmount: true,
                  rewardDescription: true,
                  token: { select: { symbol: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          []
        ),
        safeQuery("stakingPositions", () =>
          prisma.stakingPosition.findMany({
            where: { wallet: walletMatch, isActive: true },
            orderBy: { stakedAt: "desc" },
          }),
          []
        ),
        safeQuery("launchpoolStakes", () =>
          prisma.launchpoolStake.findMany({
            where: { walletAddress: walletMatch, isActive: true },
            include: { launchpool: { select: { id: true, title: true } } },
            orderBy: { stakedAt: "desc" },
          }),
          []
        ),
      ]);

      const lockAmountWei = liquidityLocks.reduce((sum, row) => sum + BigInt(row.amount || "0"), 0n);

      const rewardSummaries = completedParticipations.map((p) =>
        formatBountyReward({
          rewardType: p.bounty.rewardType,
          rewardAmount: p.bounty.rewardAmount,
          rewardDescription: p.bounty.rewardDescription,
          tokenSymbol: p.bounty.token?.symbol ?? null,
        })
      );

      const opnRewards = completedParticipations
        .filter((p) => p.bounty.rewardType === "OPN")
        .reduce((sum, p) => sum + Number(p.bounty.rewardAmount || 0), 0);

      const creatorEarningsWei = await safeQuery(
        "creatorEarnings",
        () => getCreatorEarningsTotal(wallet),
        "0"
      );
      const creatorEarningsOpn = weiToOpnFloat(BigInt(creatorEarningsWei || "0"));

      const launchpoolRewards = await safeQuery(
        "launchpoolRewards",
        () => getUnclaimedLaunchpoolRewards(wallet),
        []
      );
      const launchpoolRewardRows = launchpoolRewards.map((reward) => ({
        id: reward.id,
        launchpoolId: reward.launchpoolId,
        launchpoolTitle: reward.launchpool.title,
        amount: reward.amount,
        tokenSymbol: reward.tokenSymbol,
        tokenAddress: reward.tokenAddress,
        displayAmount: formatUnits(BigInt(reward.amount || "0"), 18),
        accruedAt: reward.accruedAt.toISOString(),
      }));

      const stakingPositions = stakingRows.map(serializeStakingPosition);

      const launchpoolStakes = launchpoolStakeRows.map((stake) => ({
        id: stake.id,
        launchpoolId: stake.launchpoolId,
        launchpoolTitle: stake.launchpool.title,
        assetType: stake.assetType,
        assetSymbol: stake.assetSymbol,
        assetAddress: stake.assetAddress,
        amount: stake.amount,
        stakedAt: stake.stakedAt.toISOString(),
      }));

      const activities: UserActivity[] = [];

      for (const stake of stakingRows) {
        activities.push({
          id: `stake-${stake.id}`,
          kind: "stake",
          title: stake.assetType === "OPN" ? "Staked OPN" : "Staked LP token",
          subtitle: stake.tier ? `Staking tier: ${stake.tier}` : "Recorded on FansPump",
          amount: formatActivityAmount(stake.amount, 18, stake.assetType === "OPN" ? "OPN" : "LP"),
          platform: "FansPump",
          occurredAt: stake.stakedAt.toISOString(),
          href: "/staking",
        });
      }

      for (const stake of launchpoolStakeRows) {
        activities.push({
          id: `launchpool-stake-${stake.id}`,
          kind: "stake",
          title: `Launchpool · ${stake.launchpool.title}`,
          subtitle: `Staked ${stake.assetSymbol} · redeem anytime`,
          amount: formatActivityAmount(stake.amount, 18, stake.assetSymbol),
          platform: "FansPump",
          occurredAt: stake.stakedAt.toISOString(),
          href: "/launchpool",
        });
      }

      for (const lock of liquidityLocks) {
        activities.push({
          id: `lock-${lock.id}`,
          kind: "lock",
          title: `Liquidity locked · ${lock.token.symbol}`,
          subtitle: `Unlocks ${lock.unlockAt.toLocaleDateString()}`,
          amount: formatActivityAmount(lock.amount, 18, "LP"),
          platform: "OPN Network",
          occurredAt: lock.createdAt.toISOString(),
          href: `/liquidity/${lock.tokenAddress}`,
        });
      }

      for (const burn of lpBurnRows) {
        activities.push({
          id: `burn-${burn.id}`,
          kind: "liquidity",
          title: `LP burned · ${burn.token.symbol}`,
          subtitle: "Liquidity permanently removed",
          amount: formatActivityAmount(burn.amount, 18, "LP"),
          platform: "FansPump",
          occurredAt: burn.burnedAt.toISOString(),
          href: `/liquidity/${burn.tokenAddress}`,
        });
      }

      for (const token of tokensCreatedRows) {
        activities.push({
          id: `token-${token.id}`,
          kind: "token",
          title: `Created token · ${token.symbol}`,
          subtitle: token.name,
          platform: "FansPump",
          occurredAt: token.createdAt.toISOString(),
          href: `/token/${token.contractAddress}`,
        });
      }

      for (const row of joinedQuests) {
        activities.push({
          id: `quest-join-${row.id}`,
          kind: "quest",
          title: `Joined quest · ${row.bounty.title}`,
          subtitle: row.bounty.status === "COMPLETED" ? "Completed" : "In progress",
          platform: "FansPump",
          occurredAt: row.createdAt.toISOString(),
          href: "/earn",
        });
      }

      for (const row of completedParticipations) {
        const reward = formatBountyReward({
          rewardType: row.bounty.rewardType,
          rewardAmount: row.bounty.rewardAmount,
          rewardDescription: row.bounty.rewardDescription,
          tokenSymbol: row.bounty.token?.symbol ?? null,
        });
        activities.push({
          id: `quest-reward-${row.id}`,
          kind: "reward",
          title: `Quest reward · ${row.bounty.title}`,
          subtitle: reward,
          platform: "FansPump",
          occurredAt: (row.bounty.completedAt ?? row.createdAt).toISOString(),
          href: "/earn",
        });
      }

      for (const bounty of bountiesCreatedRows) {
        activities.push({
          id: `quest-created-${bounty.id}`,
          kind: "quest",
          title: `Created quest · ${bounty.title}`,
          platform: "FansPump",
          occurredAt: bounty.createdAt.toISOString(),
          href: "/earn",
        });
      }

      res.json({
        stats: {
          tokensCreated: tokensCreatedRows.length,
          liquidityLocks: liquidityLocks.length,
          liquidityBurns: lpBurnRows.length,
          liquidityLockedAmount: lockAmountWei.toString(),
          questsCreated: bountiesCreatedRows.length,
          questsJoined: joinedQuests.length,
          questsCompleted: completedParticipations.length,
          rewardsEarned: rewardSummaries,
          rewardsEarnedOpn: opnRewards,
          creatorEarningsOpn,
          activeStakes: stakingRows.length + launchpoolStakeRows.length,
          launchpoolRewards: launchpoolRewardRows,
        },
        stakingPositions,
        launchpoolStakes,
        launchpoolRewards: launchpoolRewardRows,
        activities: sortActivities(activities),
      });
    } catch (e) {
      console.error("[GET /api/user/dashboard]", e);
      if (isMissingTableError(e)) {
        res.status(503).json({
          error: "Dashboard data is not available yet — database migrations may be pending.",
          activities: [],
          stats: {},
        });
        return;
      }
      res.status(500).json({ error: "Failed to load dashboard stats" });
    }
  })
);

router.get(
  "/follows",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const wallet = searchParams.get("wallet")?.toLowerCase();
    const creator = searchParams.get("creator")?.toLowerCase();

    if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
      res.status(400).json({ error: "wallet required" });
      return;
    }

    try {
      if (creator) {
        if (!/^0x[a-f0-9]{40}$/.test(creator)) {
          res.status(400).json({ error: "Invalid creator wallet" });
          return;
        }
        const row = await prisma.creatorFollow.findUnique({
          where: {
            followerWallet_creatorWallet: {
              followerWallet: wallet,
              creatorWallet: creator,
            },
          },
        });
        res.json({ following: Boolean(row) });
        return;
      }

      const rows = await prisma.creatorFollow.findMany({
        where: { followerWallet: wallet },
        include: {
          creator: {
            select: {
              walletAddress: true,
              username: true,
              profileImageUrl: true,
              verification: { select: { id: true } },
              tokenProjects: {
                take: 1,
                orderBy: { createdAt: "desc" },
                select: { name: true, symbol: true, contractAddress: true },
              },
              _count: { select: { tokenProjects: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        creators: rows.map((row) => ({
          walletAddress: row.creator.walletAddress,
          username: row.creator.username,
          profileImageUrl: row.creator.profileImageUrl,
          creatorVerified: Boolean(row.creator.verification),
          tokenCount: row.creator._count.tokenProjects,
          sampleToken: row.creator.tokenProjects[0] ?? null,
          followedAt: row.createdAt.toISOString(),
        })),
      });
    } catch (e) {
      console.error("[GET /api/user/follows]", e);
      res.status(500).json({ error: "Failed to load follows" });
    }
  })
);

router.post(
  "/follows",
  asyncHandler(async (req, res) => {
    try {
      const body = followSchema.parse(req.body);
      const followerWallet = body.walletAddress.toLowerCase();
      const creatorWallet = body.creatorWallet.toLowerCase();

      if (followerWallet === creatorWallet) {
        res.status(400).json({ error: "You cannot follow yourself" });
        return;
      }

      await prisma.user.upsert({
        where: { walletAddress: followerWallet },
        create: { walletAddress: followerWallet },
        update: {},
      });
      await prisma.user.upsert({
        where: { walletAddress: creatorWallet },
        create: { walletAddress: creatorWallet },
        update: {},
      });

      await prisma.creatorFollow.upsert({
        where: {
          followerWallet_creatorWallet: { followerWallet, creatorWallet },
        },
        create: { followerWallet, creatorWallet },
        update: {},
      });

      res.json({ ok: true, following: true });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      console.error("[POST /api/user/follows]", e);
      res.status(500).json({ error: "Failed to follow creator" });
    }
  })
);

router.delete(
  "/follows",
  asyncHandler(async (req, res) => {
    try {
      const body = followSchema.parse(req.body);
      const followerWallet = body.walletAddress.toLowerCase();
      const creatorWallet = body.creatorWallet.toLowerCase();

      await prisma.creatorFollow.deleteMany({
        where: { followerWallet, creatorWallet },
      });

      res.json({ ok: true, following: false });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      console.error("[DELETE /api/user/follows]", e);
      res.status(500).json({ error: "Failed to unfollow creator" });
    }
  })
);

router.post(
  "/claim-rewards",
  asyncHandler(async (req, res) => {
    try {
      const parsed = claimSchema.parse(req.body);
      const wallet = await requireCreatorActionAuth({
        ...parsed,
        expectedPrefix: CLAIM_PREFIX,
      });

      const security = await getPlatformSetting("security", DEFAULT_SECURITY);
      if (security.claimsPaused) {
        res.status(503).json({ error: "Reward claims are temporarily paused" });
        return;
      }

      const [creatorEarningsWei, completedParticipations] = await Promise.all([
        getCreatorEarningsTotal(wallet),
        prisma.bountyParticipation.findMany({
          where: {
            walletAddress: wallet,
            bounty: { status: "COMPLETED" },
          },
          include: {
            bounty: { select: { rewardType: true, rewardAmount: true } },
          },
        }),
      ]);

      const bountyOpn = completedParticipations
        .filter((p) => p.bounty.rewardType === "OPN")
        .reduce((sum, p) => sum + Number(p.bounty.rewardAmount || 0), 0);

      const creatorOpn = weiToOpnFloat(BigInt(creatorEarningsWei || "0"));
      const launchpoolRewards = await getUnclaimedLaunchpoolRewards(wallet);
      const launchpoolSummary = launchpoolRewards.map((reward) => ({
        symbol: reward.tokenSymbol,
        amount: formatUnits(BigInt(reward.amount || "0"), 18),
        pool: reward.launchpool.title,
      }));

      const totalOpn = bountyOpn + creatorOpn;
      const hasLaunchpoolRewards = launchpoolRewards.length > 0;

      if (totalOpn <= 0 && !hasLaunchpoolRewards) {
        res.status(400).json({ error: "No claimable rewards" });
        return;
      }

      if (hasLaunchpoolRewards) {
        await markLaunchpoolRewardsClaimed(wallet);
      }

      const launchpoolText =
        launchpoolSummary.length > 0
          ? ` Launchpool: ${launchpoolSummary.map((r) => `${r.amount} ${r.symbol}`).join(", ")}.`
          : "";

      res.json({
        ok: true,
        claimedOpn: totalOpn,
        launchpoolRewards: launchpoolSummary,
        message: `Claim submitted for ${totalOpn > 0 ? `${totalOpn.toLocaleString(undefined, { maximumFractionDigits: 4 })} OPN` : "your launchpool rewards"}${launchpoolText} Payout will be processed to your wallet.`,
      });
    } catch (e) {
      if (e instanceof CreatorAuthError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: e.flatten() });
        return;
      }
      console.error("[POST /api/user/claim-rewards]", e);
      res.status(500).json({ error: "Failed to claim rewards" });
    }
  })
);

export default router;
