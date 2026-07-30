"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";

/** Lowercased contract addresses on the wallet's watchlist, for favourite filtering. */
export function useWatchlistAddresses(walletAddress: string | undefined) {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setAddresses([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/watchlist?wallet=${walletAddress.toLowerCase()}`));
      if (!res.ok) {
        setAddresses([]);
        return;
      }
      const data = (await res.json()) as { tokens?: { contractAddress?: string }[] };
      setAddresses(
        (data.tokens ?? [])
          .map((t) => t.contractAddress?.toLowerCase())
          .filter((a): a is string => Boolean(a))
      );
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addressSet = useMemo(() => new Set(addresses), [addresses]);

  return { addresses, addressSet, loading, refresh };
}
