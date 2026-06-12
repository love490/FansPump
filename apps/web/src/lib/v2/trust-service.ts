import { prisma } from "@iopn/database";
import { computeTrustScore, type TrustScoreResult } from "@/lib/v2/trust-score";
import { deriveTokenBadges } from "@/lib/v2/badges";
import { getCreatorReputation } from "@/lib/v2/reputation";
import { getPlatformSetting } from "@/lib/admin/platform-settings";
import { DEFAULT_TRUST_WEIGHTS } from "@/lib/v2/trust-score";

export type TokenTrustPayload = TrustScoreResult & {
  badges: ReturnType<typeof deriveTokenBadges>;
};

type TokenTrustRow = {
  id: string;
  featureFlags: bigint;
  ownershipRenounced: boolean;
  verificationStatus: import("@iopn/database").TokenVerificationStatus;
  isScam: boolean;
  creatorAddress: string;
  liquidityLocks?: { id: string }[];
  lpBurns?: { id: string }[];
  creator?: { verification: { id: string } | null } | null;
};

export async function buildTokenTrustPayload(token: TokenTrustRow): Promise<TokenTrustPayload> {
  const liquidityLocked = (token.liquidityLocks?.length ?? 0) > 0;
  const liquidityBurned = (token.lpBurns?.length ?? 0) > 0;
  const creatorVerified = !!token.creator?.verification;
  const creatorReputation = await getCreatorReputation(token.creatorAddress);

  const weights = await getPlatformSetting("trust_score_weights", DEFAULT_TRUST_WEIGHTS);

  const result = computeTrustScore(
    {
      featureFlags: token.featureFlags,
      ownershipRenounced: token.ownershipRenounced,
      liquidityLocked,
      liquidityBurned,
      verificationStatus: token.verificationStatus,
      creatorVerified,
      creatorReputation,
      isScam: token.isScam,
    },
    weights
  );

  const badges = deriveTokenBadges({
    liquidityLocked,
    liquidityBurned,
    ownershipRenounced: token.ownershipRenounced,
    contractVerified: token.verificationStatus === "APPROVED",
    trustScore: result.score,
  });

  return { ...result, badges };
}

export async function refreshTokenTrustScore(tokenId: string) {
  const token = await prisma.tokenProject.findUnique({
    where: { id: tokenId },
    select: {
      id: true,
      featureFlags: true,
      ownershipRenounced: true,
      verificationStatus: true,
      isScam: true,
      creatorAddress: true,
      liquidityLocks: { select: { id: true }, take: 1 },
      lpBurns: { select: { id: true }, take: 1 },
      creator: { select: { verification: { select: { id: true } } } },
    },
  });

  if (!token) return null;

  const payload = await buildTokenTrustPayload(token);

  await prisma.$transaction([
    prisma.tokenProject.update({
      where: { id: tokenId },
      data: {
        trustScore: payload.score,
        trustScoreUpdatedAt: new Date(),
      },
    }),
    prisma.trustScoreHistory.create({
      data: {
        tokenId,
        trustScore: payload.score,
        breakdown: payload.breakdown,
      },
    }),
  ]);

  return payload;
}
