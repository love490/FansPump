import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { isAddress } from "viem";
import { getV2FeatureFlags } from "@/lib/v2/feature-flags";
import { buildTokenTrustPayload } from "@/lib/v2/trust-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const flags = getV2FeatureFlags();
  if (!flags.trustScore) {
    return NextResponse.json({ enabled: false });
  }

  const { address: raw } = await params;
  const address = raw.toLowerCase();
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const token = await prisma.tokenProject.findUnique({
      where: { contractAddress: address },
      select: {
        id: true,
        featureFlags: true,
        ownershipRenounced: true,
        verificationStatus: true,
        isScam: true,
        creatorAddress: true,
        trustScore: true,
        trustScoreUpdatedAt: true,
        holderCount: true,
        volume24h: true,
        poolStrength: true,
        liquidityLocks: { select: { id: true }, take: 1 },
        lpBurns: { select: { id: true }, take: 1 },
        creator: { select: { verification: { select: { id: true } } } },
      },
    });

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const trust = await buildTokenTrustPayload(token);

    return NextResponse.json({
      enabled: true,
      tokenId: token.id,
      cachedScore: token.trustScore,
      cachedAt: token.trustScoreUpdatedAt?.toISOString() ?? null,
      trust,
      health: {
        holders: token.holderCount,
        liquidity: token.poolStrength,
        volume24h: token.volume24h,
        ownershipRenounced: token.ownershipRenounced,
        liquidityLocked: (token.liquidityLocks?.length ?? 0) > 0,
        liquidityBurned: (token.lpBurns?.length ?? 0) > 0,
        contractVerified: token.verificationStatus === "APPROVED",
      },
    });
  } catch (e) {
    console.error("[GET /api/trust/:address]", e);
    return NextResponse.json({ error: "Failed to load trust score" }, { status: 500 });
  }
}
