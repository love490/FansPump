import { Router } from "express";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { recordDailyMetricsSnapshot, refreshAllTrustScores } from "../lib/trust/service";
import { asyncHandler, requireAnalyticsSyncSecret } from "../lib/http-helpers";

const router = Router();

router.post(
  "/metrics-snapshot",
  asyncHandler(async (req, res) => {
    if (!requireAnalyticsSyncSecret(req, res)) return;

    try {
      const chainId = getActiveChainId();
      const [snapshots, trust] = await Promise.all([
        recordDailyMetricsSnapshot(chainId),
        refreshAllTrustScores(chainId),
      ]);

      res.json({ ok: true, snapshots, trust });
    } catch (e) {
      console.error("[POST /api/cron/metrics-snapshot]", e);
      res.status(500).json({
        error: "Snapshot failed",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  })
);

export default router;
