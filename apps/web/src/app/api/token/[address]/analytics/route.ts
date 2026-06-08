import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { prisma } from "@iopn/database";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { refreshTokenHolderCount } from "@/lib/analytics/holder-count";
import { getTokenAnalytics } from "@/lib/analytics/queries";
import { opnChain } from "@/lib/wagmi";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    let analytics = await getTokenAnalytics(address);

    if (!analytics) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    if (analytics.holders === 0) {
      try {
        const token = await prisma.tokenProject.findUnique({
          where: { contractAddress: address.toLowerCase() },
          select: { id: true, contractAddress: true },
        });
        if (token) {
          const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || opnChainConfig.rpcUrl;
          const client = createPublicClient({ chain: opnChain, transport: http(rpcUrl) });
          analytics = {
            ...analytics,
            holders: await refreshTokenHolderCount(client, token.id, token.contractAddress),
          };
        }
      } catch {
        // Keep cached / zero value if RPC scan fails.
      }
    }

    return NextResponse.json(
      { analytics },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } }
    );
  } catch (e) {
    console.error("[GET /api/token/:address/analytics]", e);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
