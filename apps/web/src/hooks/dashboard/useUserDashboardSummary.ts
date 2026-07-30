"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { useActiveWallet } from "@/hooks/useActiveWallet";

type LaunchpoolRewardRow = {
  id: string;
  launchpoolTitle: string;
  displayAmount: string;
  tokenSymbol: string;
};

type DashboardSummaryApi = {
  stats?: {
    tokensCreated?: number;
    liquidityLocks?: number;
    liquidityBurns?: number;
    rewardsEarnedOpn?: number;
    creatorEarningsOpn?: number;
    activeStakes?: number;
    launchpoolRewards?: LaunchpoolRewardRow[];
  };
  launchpoolRewards?: LaunchpoolRewardRow[];
};

/** Wallet-level totals from `GET /api/user/dashboard`, shared by the dashboard summary cards. */
export function useUserDashboardSummary() {
  const { walletAddress } = useActiveWallet();
  const [data, setData] = useState<DashboardSummaryApi | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/user/dashboard?wallet=${walletAddress.toLowerCase()}`));
      setData(res.ok ? ((await res.json()) as DashboardSummaryApi) : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const launchpoolRewards = data?.launchpoolRewards ?? data?.stats?.launchpoolRewards ?? [];
  const pendingOpn =
    (data?.stats?.rewardsEarnedOpn ?? 0) + (data?.stats?.creatorEarningsOpn ?? 0);

  return {
    stats: data?.stats ?? null,
    launchpoolRewards,
    pendingOpn,
    pendingRewardCount: launchpoolRewards.length + (pendingOpn > 0 ? 1 : 0),
    loading,
    refresh,
  };
}
