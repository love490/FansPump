import type { SecurityBadge } from "@/lib/v2/badges";

export interface TokenCardData {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  description?: string | null;
  viewCount: number;
  holderCount: number;
  creatorVerified?: boolean;
  isFeatured?: boolean;
  volume24h?: number | null;
  volumeTotal?: number | null;
  txCount24h?: number;
  poolStrength?: number;
  creatorEarningsWei?: string;
  category?: string;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
  createdAt?: string | Date;
  creatorAddress?: string;
  creatorUsername?: string | null;
  creatorProfileImageUrl?: string | null;
  marketCap?: number | null;
  trustScore?: number;
  contractVerified?: boolean;
  badges?: SecurityBadge[];
}
