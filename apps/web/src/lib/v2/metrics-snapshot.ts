import { prisma } from "@iopn/database";
import { refreshTokenTrustScore } from "@/lib/v2/trust-service";

/** Collect daily token metrics for future analytics (not displayed yet). */
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

/** Refresh trust scores for all tokens on a chain. */
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
