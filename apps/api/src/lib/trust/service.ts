import prisma from "../prisma";
import { deriveTokenBadges } from "@/lib/v2/badges";
import {
  tierLabel,
  tierRiskLevel,
  TRUST_COMPONENT_LABELS,
  TRUST_COMPONENT_WEIGHTS,
  type TrustComponentKey,
  type TrustScoreResult,
} from "@/lib/trust/types";
import { calculateTrustScore } from "./scoring-engine";

const CACHE_TTL_MS = 30 * 60 * 1000;

export type TrustApiPayload = TrustScoreResult & {
  badges: ReturnType<typeof deriveTokenBadges>;
  trust: {
    score: number;
    tier: TrustScoreResult["tier"];
    riskLevel: string;
    riskLabel: string;
    contractSafety: number;
    liquiditySafety: number;
    marketIntegrity: number;
    creatorReputation: number;
    breakdown: {
      key: TrustComponentKey;
      label: string;
      score: number;
      weight: number;
    }[];
    badges: ReturnType<typeof deriveTokenBadges>;
    signals: TrustScoreResult["signals"];
    calculatedAt: string;
  };
};

function toTrustView(result: TrustScoreResult, badges: ReturnType<typeof deriveTokenBadges>) {
  const keys: TrustComponentKey[] = [
    "contractSafety",
    "liquiditySafety",
    "marketIntegrity",
    "creatorReputation",
  ];

  return {
    score: result.score,
    tier: result.tier,
    riskLevel: tierRiskLevel(result.tier, result.score),
    riskLabel: tierLabel(result.tier),
    contractSafety: result.contractSafety,
    liquiditySafety: result.liquiditySafety,
    marketIntegrity: result.marketIntegrity,
    creatorReputation: result.creatorReputation,
    breakdown: keys.map((key) => ({
      key,
      label: TRUST_COMPONENT_LABELS[key],
      score: result[key],
      weight: TRUST_COMPONENT_WEIGHTS[key],
    })),
    badges,
    signals: result.signals,
    calculatedAt: result.calculatedAt,
  };
}

async function loadTokenForScoring(tokenAddress: string) {
  return prisma.tokenProject.findUnique({
    where: { contractAddress: tokenAddress.toLowerCase() },
    select: {
      id: true,
      contractAddress: true,
      creatorAddress: true,
      featureFlags: true,
      ownershipRenounced: true,
      verificationStatus: true,
      isScam: true,
      poolStrength: true,
      holderCount: true,
      volume24h: true,
      txCount24h: true,
      trustScore: true,
      trustScoreUpdatedAt: true,
      liquidityLocks: { select: { id: true }, take: 1 },
      lpBurns: { select: { id: true }, take: 1 },
    },
  });
}

export async function refreshTokenTrustScore(tokenId: string): Promise<TrustScoreResult | null> {
  const token = await prisma.tokenProject.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      contractAddress: true,
      creatorAddress: true,
      featureFlags: true,
      ownershipRenounced: true,
      verificationStatus: true,
      isScam: true,
      poolStrength: true,
      holderCount: true,
      volume24h: true,
      txCount24h: true,
      lpBurns: { select: { id: true }, take: 1 },
    },
  });

  if (!token) return null;

  const result = await calculateTrustScore({
    tokenAddress: token.contractAddress,
    tokenId: token.id,
    creatorAddress: token.creatorAddress,
    featureFlags: token.featureFlags,
    ownershipRenounced: token.ownershipRenounced,
    verificationStatus: token.verificationStatus,
    isScam: token.isScam,
    poolStrength: token.poolStrength,
    holderCount: token.holderCount,
    volume24h: token.volume24h,
    txCount24h: token.txCount24h,
    hasLpBurn: (token.lpBurns?.length ?? 0) > 0,
  });

  await prisma.$transaction([
    prisma.tokenProject.update({
      where: { id: tokenId },
      data: {
        trustScore: result.score,
        trustScoreUpdatedAt: new Date(),
      },
    }),
    prisma.trustScoreHistory.create({
      data: {
        tokenId,
        trustScore: result.score,
        breakdown: result as unknown as object,
      },
    }),
  ]);

  return result;
}

export async function getTrustPayload(
  tokenAddress: string,
  options?: { forceRefresh?: boolean }
): Promise<TrustApiPayload | null> {
  const token = await loadTokenForScoring(tokenAddress);
  if (!token) return null;

  let result: TrustScoreResult | null = null;
  const age = token.trustScoreUpdatedAt
    ? Date.now() - token.trustScoreUpdatedAt.getTime()
    : Number.POSITIVE_INFINITY;

  if (!options?.forceRefresh && age < CACHE_TTL_MS && token.trustScore > 0) {
    const latest = await prisma.trustScoreHistory.findFirst({
      where: { tokenId: token.id },
      orderBy: { recordedAt: "desc" },
    });
    if (latest?.breakdown && typeof latest.breakdown === "object") {
      result = latest.breakdown as unknown as TrustScoreResult;
    }
  }

  if (!result) {
    result = await calculateTrustScore({
      tokenAddress: token.contractAddress,
      tokenId: token.id,
      creatorAddress: token.creatorAddress,
      featureFlags: token.featureFlags,
      ownershipRenounced: token.ownershipRenounced,
      verificationStatus: token.verificationStatus,
      isScam: token.isScam,
      poolStrength: token.poolStrength,
      holderCount: token.holderCount,
      volume24h: token.volume24h,
      txCount24h: token.txCount24h,
      hasLpBurn: (token.lpBurns?.length ?? 0) > 0,
    });

    await prisma.$transaction([
      prisma.tokenProject.update({
        where: { id: token.id },
        data: {
          trustScore: result.score,
          trustScoreUpdatedAt: new Date(),
        },
      }),
      prisma.trustScoreHistory.create({
        data: {
          tokenId: token.id,
          trustScore: result.score,
          breakdown: result as unknown as object,
        },
      }),
    ]);
  }

  const badges = deriveTokenBadges({
    liquidityLocked: (token.liquidityLocks?.length ?? 0) > 0,
    liquidityBurned: (token.lpBurns?.length ?? 0) > 0,
    ownershipRenounced: token.ownershipRenounced,
    contractVerified: token.verificationStatus === "APPROVED",
    trustScore: result.score,
  });

  return {
    ...result,
    badges,
    trust: toTrustView(result, badges),
  };
}

export async function refreshAllTrustScores(chainId: number, limit = 200) {
  const tokens = await prisma.tokenProject.findMany({
    where: { chainId, isHidden: false },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  let updated = 0;
  for (const t of tokens) {
    await refreshTokenTrustScore(t.id);
    updated++;
  }
  return { updated };
}

/** Collect daily token metrics for analytics. */
export async function recordDailyMetricsSnapshot(chainId: number) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const tokens = await prisma.tokenProject.findMany({
    where: { chainId, isHidden: false },
    select: {
      id: true,
      holderCount: true,
      poolStrength: true,
      volume24h: true,
      trustScore: true,
    },
  });

  let recorded = 0;
  for (const token of tokens) {
    await prisma.tokenDailySnapshot.upsert({
      where: {
        tokenId_snapshotDate: { tokenId: token.id, snapshotDate: today },
      },
      create: {
        tokenId: token.id,
        snapshotDate: today,
        holderCount: token.holderCount,
        liquidityScore: token.poolStrength,
        volume24h: token.volume24h,
        trustScore: token.trustScore,
      },
      update: {
        holderCount: token.holderCount,
        liquidityScore: token.poolStrength,
        volume24h: token.volume24h,
        trustScore: token.trustScore,
      },
    });
    recorded++;
  }

  return { recorded, date: today.toISOString() };
}
