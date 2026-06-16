import { Router } from "express";
import { getActiveChainId } from "../lib/chain-config/opn";
import { getV2FeatureFlags } from "../lib/v2/feature-flags";
import { deriveCreatorBadges } from "../lib/v2/badges";
import { resolveCreatorStatus } from "../lib/v2/reputation";
import prisma from "../lib/prisma";
import { asyncHandler, queryToSearchParams } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

export type LeaderboardCategory =
  | "top-builders"
  | "most-viewed"
  | "most-liquidity"
  | "fastest-growing"
  | "most-active"
  | "most-trusted";

const router = Router();

router.use(publicRateLimit);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const flags = getV2FeatureFlags();
    if (!flags.leaderboards) {
      res.json({ enabled: false, entries: [] });
      return;
    }

    const searchParams = queryToSearchParams(req.query);
    const category = (searchParams.get("category") ?? "top-builders") as LeaderboardCategory;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());

    try {
      const creators = await prisma.tokenProject.groupBy({
        by: ["creatorAddress"],
        where: { chainId, isHidden: false },
        _count: { id: true },
        _sum: { viewCount: true, volumeTotal: true, poolStrength: true, holderCount: true },
        _max: { trendingScore: true, trustScore: true, createdAt: true },
      });

      const wallets = creators.map((c) => c.creatorAddress);
      const [profiles, verifications, users] = await Promise.all([
        prisma.creatorProfile.findMany({ where: { walletAddress: { in: wallets } } }),
        prisma.creatorVerification.findMany({ where: { walletAddress: { in: wallets } } }),
        prisma.user.findMany({
          where: { walletAddress: { in: wallets } },
          select: { walletAddress: true, username: true },
        }),
      ]);

      const profileMap = new Map(profiles.map((p) => [p.walletAddress, p]));
      const verifiedSet = new Set(verifications.map((v) => v.walletAddress));
      const usernameMap = new Map(users.map((u) => [u.walletAddress, u.username]));

      type Entry = {
        rank: number;
        walletAddress: string;
        displayName?: string | null;
        tokensCreated: number;
        totalViews: number;
        totalLiquidity: number;
        reputationScore: number;
        avgTrustScore: number;
        status: string;
        badges: ReturnType<typeof deriveCreatorBadges>;
        score: number;
      };

      let entries: Entry[] = creators.map((c) => {
        const profile = profileMap.get(c.creatorAddress);
        const walletVerified = verifiedSet.has(c.creatorAddress);
        const status = resolveCreatorStatus({
          profileStatus: profile?.status ?? "ANONYMOUS",
          walletVerified,
          reputationScore: profile?.reputationScore ?? 0,
        });

        const badges = deriveCreatorBadges({
          badges: profile?.badges ?? [],
          reputationScore: profile?.reputationScore ?? 0,
          tokensCreated: c._count.id,
          joinedAt: profile?.joinedAt ?? c._max.createdAt ?? new Date(),
          walletVerified,
          status,
        });

        const base = {
          walletAddress: c.creatorAddress,
          displayName: usernameMap.get(c.creatorAddress) ?? null,
          tokensCreated: c._count.id,
          totalViews: c._sum.viewCount ?? 0,
          totalLiquidity: c._sum.poolStrength ?? 0,
          reputationScore: profile?.reputationScore ?? 0,
          avgTrustScore: c._max.trustScore ?? 0,
          status,
          badges,
        };

        let score = 0;
        switch (category) {
          case "top-builders":
            score = c._count.id * 10 + (profile?.reputationScore ?? 0);
            break;
          case "most-viewed":
            score = c._sum.viewCount ?? 0;
            break;
          case "most-liquidity":
            score = c._sum.poolStrength ?? 0;
            break;
          case "fastest-growing":
            score = (c._sum.holderCount ?? 0) + (c._max.trendingScore ?? 0);
            break;
          case "most-active":
            score = (c._sum.volumeTotal ?? 0) + (c._max.trendingScore ?? 0) * 10;
            break;
          case "most-trusted":
            score = (c._max.trustScore ?? 0) + (profile?.reputationScore ?? 0) / 10;
            break;
        }

        return { ...base, score, rank: 0 };
      });

      entries.sort((a, b) => b.score - a.score);
      entries = entries.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));

      res.json({ enabled: true, category, entries });
    } catch (e) {
      console.error("[GET /api/leaderboard]", e);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  })
);

export default router;

