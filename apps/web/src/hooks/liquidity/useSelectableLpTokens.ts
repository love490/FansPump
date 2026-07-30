"use client";

import { useCallback, useMemo } from "react";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useWalletLpTokens } from "@/hooks/liquidity/useWalletLpTokens";

export type SelectableLpToken = {
  lpToken: string;
  lpBalance: bigint;
  lpDecimals: number;
  tokenAddress: string;
  tokenSymbol: string;
  pairLabel: string;
};

/**
 * Every LP token a wallet can lock or burn: indexed positions plus pair tokens
 * discovered directly from wallet balances.
 */
export function useSelectableLpTokens(walletAddress: string | undefined) {
  const {
    positions,
    loading: positionsLoading,
    refresh: refreshPositions,
  } = useMyLiquidityPositions(walletAddress);
  const {
    lpTokens,
    loading: lpLoading,
    refresh: refreshLpTokens,
  } = useWalletLpTokens(walletAddress);

  const options = useMemo(() => {
    const merged = new Map<string, SelectableLpToken>();

    for (const position of positions) {
      if (position.pending || !position.lpToken || position.lpBalance <= 0n) continue;
      merged.set(position.lpToken.toLowerCase(), {
        lpToken: position.lpToken.toLowerCase(),
        lpBalance: position.lpBalance,
        lpDecimals: position.lpDecimals,
        tokenAddress: position.tokenAddress,
        tokenSymbol: position.tokenSymbol,
        pairLabel: position.pairLabel,
      });
    }

    for (const lp of lpTokens) {
      const key = lp.lpToken.toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        // Wallet balance is authoritative for what can be moved right now.
        merged.set(key, { ...existing, lpBalance: lp.lpBalance, lpDecimals: lp.lpDecimals });
        continue;
      }
      merged.set(key, {
        lpToken: key,
        lpBalance: lp.lpBalance,
        lpDecimals: lp.lpDecimals,
        tokenAddress: lp.projectToken,
        tokenSymbol: lp.projectSymbol,
        pairLabel: lp.quoteSymbol,
      });
    }

    return [...merged.values()].sort((a, b) =>
      a.lpBalance === b.lpBalance ? 0 : a.lpBalance > b.lpBalance ? -1 : 1
    );
  }, [positions, lpTokens]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshPositions(), refreshLpTokens()]);
  }, [refreshPositions, refreshLpTokens]);

  return { options, loading: positionsLoading || lpLoading, refresh };
}
