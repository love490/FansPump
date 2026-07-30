"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

type TokenSummary = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
};

export type WalletLockRow = {
  id: string;
  tokenAddress: string;
  lpToken: string;
  lockerAddress: string;
  amount: string;
  unlockAt: string;
  txHash?: string | null;
  createdAt: string;
  status: "LOCKED" | "UNLOCKED";
  token?: TokenSummary | null;
};

export type WalletBurnRow = {
  id: string;
  tokenAddress: string;
  lpToken: string;
  amount: string;
  burnAddress: string;
  txHash?: string | null;
  burnedAt: string;
  token?: TokenSummary | null;
};

type WalletLiquidityHistory = {
  locks: WalletLockRow[];
  burns: WalletBurnRow[];
  totals: { lockedAmount: string; burnedAmount: string; activeLocks: number };
};

const EMPTY: WalletLiquidityHistory = {
  locks: [],
  burns: [],
  totals: { lockedAmount: "0", burnedAmount: "0", activeLocks: 0 },
};

/** Lock and burn records for the connected wallet (`GET /api/liquidity/wallet/:wallet`). */
export function useWalletLiquidityHistory(walletAddress: string | undefined) {
  const [data, setData] = useState<WalletLiquidityHistory>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setData(EMPTY);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/liquidity/wallet/${walletAddress.toLowerCase()}`),
        { cache: "no-store" }
      );
      if (!res.ok) {
        setData(EMPTY);
        return;
      }
      const body = (await res.json()) as Partial<WalletLiquidityHistory>;
      setData({
        locks: body.locks ?? [],
        burns: body.burns ?? [],
        totals: body.totals ?? EMPTY.totals,
      });
    } catch {
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}
