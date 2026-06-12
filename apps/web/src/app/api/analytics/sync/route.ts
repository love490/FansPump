import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getActiveChainId, opnChain, opnChainConfig } from "@/lib/chain-config/opn";
import { refreshAllTokenHolderCounts } from "@/lib/analytics/holder-count";
import { refreshRolling24hMetrics, syncAnalyticsFromChain } from "@/lib/analytics/indexer";
import { recordDailyMetricsSnapshot, refreshAllTrustScores } from "@/lib/v2/metrics-snapshot";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";
export async function POST(request: NextRequest) {
  const secret = process.env.ANALYTICS_SYNC_SECRET;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    return NextResponse.json({ ok: true, ...result, holders, v2Metrics: { snapshots, trust } });
  } catch (e) {
    console.error("[POST /api/analytics/sync]", e);
    return NextResponse.json(
      { error: "Sync failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
