import type { Prisma } from "@iopn/database";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";
import { deriveTokenBadges } from "@/lib/v2/badges";

/** Shared token select for discovery / list APIs (backward compatible). */
export const tokenListSelect = {
  id: true,
  contractAddress: true,
  chainId: true,
  name: true,
  symbol: true,
  logoUrl: true,
  description: true,
  viewCount: true,
  holderCount: true,
  isFeatured: true,
  featureFlags: true,
  createdAt: true,
  creatorAddress: true,
  volume24h: true,
  volumeTotal: true,
  txCount24h: true,
  txCountTotal: true,
  lastActivity: true,
  poolStrength: true,
  category: true,
  ownershipRenounced: true,
  trustScore: true,
  verificationStatus: true,
  creator: { select: { username: true, profileImageUrl: true, verification: { select: { id: true } } } },
  liquidityLocks: { select: { id: true }, take: 1 },
  lpBurns: { select: { id: true }, take: 1 },
  poolStats: { select: { accumulatedPoolValue: true } },
} satisfies Prisma.TokenProjectSelect;

function estimateMarketCap(
  poolValueWei: string | undefined | null,
  volumeTotal: number
): number | null {
  if (poolValueWei && poolValueWei !== "0") {
    try {
      return weiToOpnFloat(BigInt(poolValueWei)) * 2;
    } catch {
      /* invalid wei string */
    }
  }
  return volumeTotal > 0 ? volumeTotal : null;
}

export function mapTokenListRowSafe(
  rows: Parameters<typeof mapTokenListRow>[0][]
): ReturnType<typeof mapTokenListRow>[] {
  const mapped: ReturnType<typeof mapTokenListRow>[] = [];
  for (const row of rows) {
    try {
      mapped.push(mapTokenListRow(row));
    } catch (e) {
      console.warn("[mapTokenListRow] skipped row", row.id, e);
    }
  }
  return mapped;
}

export function mapTokenListRow(t: {
  id: string;
  contractAddress: string;
  chainId: number;
  name: string;
  symbol: string;
  logoUrl: string | null;
  description: string | null;
  viewCount: number;
  holderCount: number;
  isFeatured: boolean;
  featureFlags: bigint;
  createdAt: Date;
  creatorAddress: string;
  volume24h: number;
  volumeTotal: number;
  txCount24h: number;
  txCountTotal: number;
  lastActivity: Date | null;
  poolStrength: number;
  category?: string;
  ownershipRenounced?: boolean;
  trustScore?: number;
  verificationStatus?: string;
  creator?: {
    username: string | null;
    profileImageUrl?: string | null;
    verification: { id: string } | null;
  } | null;
  liquidityLocks?: { id: string }[];
  lpBurns?: { id: string }[];
  poolStats?: { accumulatedPoolValue: string } | null;
}) {
  return {
    id: t.id,
    contractAddress: t.contractAddress,
    chainId: t.chainId,
    name: t.name,
    symbol: t.symbol,
    logoUrl: t.logoUrl,
    description: t.description,
    viewCount: t.viewCount,
    holderCount: t.holderCount,
    isFeatured: t.isFeatured,
    featureFlags: t.featureFlags.toString(),
    createdAt: t.createdAt.toISOString(),
    creatorAddress: t.creatorAddress,
    creatorUsername: t.creator?.username ?? null,
    creatorProfileImageUrl: t.creator?.profileImageUrl ?? null,
    volume24h: t.volume24h,
    volumeTotal: t.volumeTotal,
    txCount24h: t.txCount24h,
    txCountTotal: t.txCountTotal,
    lastActivity: t.lastActivity?.toISOString() ?? null,
    poolStrength: t.poolStrength,
    marketCap: estimateMarketCap(t.poolStats?.accumulatedPoolValue, t.volumeTotal),
    category: t.category ?? "OTHER",
    ownershipRenounced: t.ownershipRenounced ?? false,
    liquidityLocked:
      (t.liquidityLocks?.length ?? 0) > 0 || (t.lpBurns?.length ?? 0) > 0,
    creatorVerified: !!t.creator?.verification,
    trustScore: t.trustScore ?? 0,
    contractVerified: t.verificationStatus === "APPROVED",
    badges: deriveTokenBadges({
      liquidityLocked: (t.liquidityLocks?.length ?? 0) > 0,
      liquidityBurned: (t.lpBurns?.length ?? 0) > 0,
      ownershipRenounced: t.ownershipRenounced ?? false,
      contractVerified: t.verificationStatus === "APPROVED",
      trustScore: t.trustScore ?? 0,
    }),
  };
}
