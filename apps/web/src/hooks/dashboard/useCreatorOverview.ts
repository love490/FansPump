"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export type CreatorOverview = {
  tokensCreated: number;
  totalTrades: number;
  followers: number;
  /** Present only when creator-profile features are enabled on the API. */
  avgTrustScore?: number;
  liquidityAdded?: number;
  reputationScore?: number;
  creatorStatus?: string;
  questsCompleted?: number;
};

type CreatorApi = { profile?: CreatorOverview & Record<string, unknown> };

/**
 * Creator-side totals for the wallet (`GET /api/creator/:wallet`).
 *
 * Only fetched when the wallet is known to have created a token, since the
 * endpoint also counts a profile view on each read.
 */
export function useCreatorOverview(walletAddress: string | undefined, enabled: boolean) {
  const [data, setData] = useState<CreatorOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress || !enabled) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/creator/${walletAddress.toLowerCase()}`));
      if (!res.ok) {
        setData(null);
        return;
      }
      const body = (await res.json()) as CreatorApi;
      setData(body.profile ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
