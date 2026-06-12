import { NextRequest, NextResponse } from "next/server";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { recordDailyMetricsSnapshot, refreshAllTrustScores } from "@/lib/v2/metrics-snapshot";

export async function POST(request: NextRequest) {
  const secret = process.env.ANALYTICS_SYNC_SECRET;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chainId = getActiveChainId();
    const [snapshots, trust] = await Promise.all([
      recordDailyMetricsSnapshot(chainId),
      refreshAllTrustScores(chainId),
    ]);

    return NextResponse.json({ ok: true, snapshots, trust });
  } catch (e) {
    console.error("[POST /api/cron/metrics-snapshot]", e);
    return NextResponse.json(
      { error: "Snapshot failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
