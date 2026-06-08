import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { getActiveChainId, opnChainConfig } from "@/lib/chain-config/opn";
import { refreshAllTokenHolderCounts } from "@/lib/analytics/holder-count";
import { refreshRolling24hMetrics, syncAnalyticsFromChain } from "@/lib/analytics/indexer";
import { opnChain } from "@/lib/wagmi";

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

    return NextResponse.json({ ok: true, ...result, holders });
  } catch (e) {
    console.error("[POST /api/analytics/sync]", e);
    return NextResponse.json(
      { error: "Sync failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
