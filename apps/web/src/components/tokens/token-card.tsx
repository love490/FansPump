"use client";

import { TokenPreviewCard } from "@/components/tokens/token-preview-card";
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
  volume24h?: number;
  volumeTotal?: number;
  txCount24h?: number;
  poolStrength?: number;
  creatorEarningsWei?: string;
  category?: string;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
  createdAt?: string;
  creatorAddress?: string;
  creatorUsername?: string | null;
  marketCap?: number | null;
  trustScore?: number;
  contractVerified?: boolean;
  badges?: SecurityBadge[];
}

/** Launchpad-style token card — shared across discover, lists, and dashboards. */
export function TokenCard({
  token,
  index = 0,
  className,
}: {
  token: TokenCardData;
  index?: number;
  className?: string;
}) {
  return <TokenPreviewCard token={token} index={index} className={className} />;
}
