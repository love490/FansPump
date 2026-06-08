import type { Prisma } from "@iopn/database";

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
  volume24h: true,
  volumeTotal: true,
  txCount24h: true,
  txCountTotal: true,
  lastActivity: true,
  poolStrength: true,
  creator: { select: { verification: { select: { id: true } } } },
} satisfies Prisma.TokenProjectSelect;

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
  volume24h: number;
  volumeTotal: number;
  txCount24h: number;
  txCountTotal: number;
  lastActivity: Date | null;
  poolStrength: number;
  creator?: { verification: { id: string } | null } | null;
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
    volume24h: t.volume24h,
    volumeTotal: t.volumeTotal,
    txCount24h: t.txCount24h,
    txCountTotal: t.txCountTotal,
    lastActivity: t.lastActivity?.toISOString() ?? null,
    poolStrength: t.poolStrength,
    creatorVerified: !!t.creator?.verification,
  };
}
