"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

type TokenCreatorMeta = {
  symbol: string;
  creatorAddress: string;
  featureFlags: number;
  decimals?: number;
};

export function useIsTokenCreator(tokenAddress: string) {
  const { address } = useAccount();
  const [token, setToken] = useState<TokenCreatorMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenAddress) {
      setToken(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(apiUrl(`/api/tokens/${tokenAddress}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const t = d?.token;
        if (!t) {
          setToken(null);
          return;
        }
        setToken({
          symbol: t.symbol ?? "Token",
          creatorAddress: String(t.creatorAddress ?? "").toLowerCase(),
          featureFlags: Number(t.featureFlags ?? 0),
          decimals: 18,
        });
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [tokenAddress]);

  const wallet = address?.toLowerCase() ?? "";
  const isCreator = !!wallet && !!token?.creatorAddress && wallet === token.creatorAddress;

  return { token, isCreator, loading };
}
