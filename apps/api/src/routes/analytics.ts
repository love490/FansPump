import { Router } from "express";
import { createPublicClient, http } from "viem";
import { TOKEN_CATEGORIES } from "@iopn/shared";
import { getActiveChainId, opnChain, opnChainConfig } from "@/lib/chain-config/opn";
import { getGlobalAnalytics } from "@/lib/analytics/queries";
import { refreshAllTokenHolderCounts } from "@/lib/analytics/holder-count";
import { refreshRolling24hMetrics, syncAnalyticsFromChain } from "@/lib/analytics/indexer";
import { recordDailyMetricsSnapshot, refreshAllTrustScores } from "../lib/trust/service";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";
import prisma from "../lib/prisma";
import { asyncHandler, requireAnalyticsSyncSecret, setCacheControl } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);

router.get(
  "/global",
  asyncHandler(async (_req, res) => {
    try {
      const analytics = await getGlobalAnalytics();
      setCacheControl(res, "public, s-maxage=30, stale-while-revalidate=60");
      res.json({ analytics });
    } catch (e) {
      console.error("[GET /api/analytics/global]", e);
      res.status(500).json({ error: "Failed to load global analytics" });
    }
  })
);

router.get(
  "/extended",
  asyncHandler(async (_req, res) => {
    const chainId = getActiveChainId();

    try {
      const [
        verifiedCreatorCount,
        announcementStats,
        categoryGroups,
        creatorEarningRows,
        swapStats,
        volumeSum,
      ] = await Promise.all([
        prisma.creatorVerification.count(),
        prisma.tokenAnnouncement.groupBy({
          by: ["type"],
          _count: true,
          where: { isHidden: false },
        }),
        prisma.tokenProject.groupBy({
          by: ["category"],
          where: { chainId },
          _count: true,
        }),
        prisma.creatorEarning.findMany({ select: { amount: true } }),
        prisma.swapActivity.count({ where: { token: { chainId } } }),
        prisma.tokenProject.aggregate({
          where: { chainId },
          _sum: { volumeTotal: true },
        }),
      ]);

      const creatorEarningsWei = creatorEarningRows.reduce(
        (acc, row) => acc + BigInt(row.amount || "0"),
        0n
      );

      const categoryStats = TOKEN_CATEGORIES.map((cat) => {
        const row = categoryGroups.find((g) => g.category === cat);
        return { category: cat, count: row?._count ?? 0 };
      });

      const announcementStatistics = announcementStats.map((a) => ({
        type: a.type,
        count: a._count,
      }));

      res.json({
        analytics: {
          verifiedCreatorCount,
          creatorEarningsWei: creatorEarningsWei.toString(),
          creatorEarningRecords: creatorEarningRows.length,
          totalVolume: volumeSum._sum.volumeTotal ?? 0,
          totalTrades: swapStats,
          categoryStats,
          announcementStatistics,
          chainId,
        },
      });
    } catch (e) {
      console.error("[GET /api/analytics/extended]", e);
      res.status(500).json({ error: "Failed to load analytics" });
    }
  })
);

router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    if (!requireAnalyticsSyncSecret(req, res)) return;

    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || opnChainConfig.rpcUrl;
      const client = createPublicClient({
        chain: opnChain,
        transport: http(rpcUrl),
      });

      const chainId = getActiveChainId();
      await refreshRolling24hMetrics(chainId);
      const result = await syncAnalyticsFromChain(client);
      const holders = await refreshAllTokenHolderCounts(client, chainId);

      const flags = getV2FeatureFlags();
      const [snapshots, trust] = await Promise.all([
        recordDailyMetricsSnapshot(chainId),
        flags.trustScore ? refreshAllTrustScores(chainId) : Promise.resolve({ updated: 0 }),
      ]);

      res.json({ ok: true, ...result, holders, v2Metrics: { snapshots, trust } });
    } catch (e) {
      console.error("[POST /api/analytics/sync]", e);
      res.status(500).json({
        error: "Sync failed",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  })
);

export default router;
