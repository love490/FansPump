"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { TrustTier } from "@/lib/trust/types";
import type { SecurityBadge } from "@/lib/v2/badges";

export type TrustView = {
  tokenAddress: string;
  score: number;
  tier: TrustTier;
  contractSafety: number;
  liquiditySafety: number;
  marketIntegrity: number;
  creatorReputation: number;
  riskLevel: string;
  riskLabel: string;
  breakdown: { key: string; label: string; score: number; weight: number }[];
  badges: SecurityBadge[];
  signals: {
    contract: Record<string, unknown>;
    liquidity: Record<string, unknown>;
    market: Record<string, unknown>;
    creator: Record<string, unknown>;
  };
  calculatedAt: string;
};

export type TrustApiResponse = {
  enabled: boolean;
  trust?: TrustView;
  health?: {
    holders: number;
    liquidity: number;
    volume24h: number;
    ownershipRenounced: boolean;
    liquidityLocked: boolean;
    liquidityBurned: boolean;
    contractVerified: boolean;
  };
};

export function useTrustScore(tokenAddress: string | undefined) {
  const [data, setData] = useState<TrustApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!!tokenAddress);
  const [isError, setIsError] = useState(false);

  const refresh = useCallback(async () => {
    if (!tokenAddress) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetch(apiUrl(`/api/trust/${tokenAddress}`), { credentials: "include" });
      const json = (await res.json()) as TrustApiResponse;
      setData(json);
    } catch {
      setIsError(true);
      setData({ enabled: false });
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    trustScore: data?.trust,
    tier: data?.trust?.tier,
    health: data?.health,
    isLoading,
    isError,
    refresh,
  };
}
