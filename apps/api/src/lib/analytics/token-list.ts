import { type Prisma } from "@iopn/database";

export const tokenListSelect = {
  id: true,
  contractAddress: true,
  name: true,
  symbol: true,
  logoUrl: true,
  chainId: true,
  creatorAddress: true,
  trustScore: true,
  volume24h: true,
  volumeTotal: true,
  holderCount: true,
  viewCount: true,
  txCount24h: true,
  trendingScore: true,
  featureFlags: true,
  isFeatured: true,
  verificationStatus: true,
  verificationSubmittedAt: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  ownershipRenounced: true,
  creator: {
    select: {
      username: true,
      verification: { select: { id: true } },
    },
  },
  liquidityLocks: { select: { id: true }, take: 1 },
  lpBurns: { select: { id: true }, take: 1 },
} satisfies Prisma.TokenProjectSelect;

type TokenListRow = Prisma.TokenProjectGetPayload<{
  select: typeof tokenListSelect;
}>;

export function mapTokenListRow(row: TokenListRow) {
  return {
    id: row.id,
    contractAddress: row.contractAddress,
    name: row.name,
    symbol: row.symbol,
    logoUrl: row.logoUrl,
    chainId: row.chainId,
    creatorAddress: row.creatorAddress,
    trustScore: row.trustScore,
    volume24h: row.volume24h ? Number(row.volume24h) : null,
    volumeTotal: row.volumeTotal ? Number(row.volumeTotal) : null,
    holderCount: row.holderCount,
    viewCount: row.viewCount,
    txCount24h: row.txCount24h,
    trendingScore: row.trendingScore,
    featureFlags: row.featureFlags.toString(),
    isFeatured: row.isFeatured,
    verificationStatus: row.verificationStatus,
    category: row.category,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ownershipRenounced: row.ownershipRenounced,
    creatorVerified: !!row.creator?.verification,
    creatorUsername: row.creator?.username ?? null,
    liquidityLocked:
      row.liquidityLocks.length > 0 || row.lpBurns.length > 0,
  };
}

export function mapTokenListRowSafe(rows: TokenListRow[]) {
  return rows.flatMap((row) => {
    try {
      return [mapTokenListRow(row)];
    } catch {
      return [];
    }
  });
}