"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export type WalletTokenActivity = {
  id: string;
  kind: "swap" | "lock" | "burn" | "token";
  title: string;
  amount?: string;
  occurredAt: string;
  txHash?: string | null;
};

export function useWalletTokenActivity(
  walletAddress: string | undefined,
  tokenAddress: string | undefined
) {
  const [activities, setActivities] = useState<WalletTokenActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress || !tokenAddress) {
      setActivities([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(
          `/api/wallet/${walletAddress.toLowerCase()}/token/${encodeURIComponent(tokenAddress)}/activity`
        ),
        { cache: "no-store" }
      );
      if (!res.ok) {
        setActivities([]);
        return;
      }
      const data = (await res.json()) as { activities?: WalletTokenActivity[] };
      setActivities(data.activities ?? []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, tokenAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activities, loading, refresh };
}
