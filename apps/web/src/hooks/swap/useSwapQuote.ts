"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { fetchSwapQuote, isValidTokenAddress, type SwapQuoteResult } from "@/lib/swap/routerAdapter";
import type { PayToken, SwapMode } from "@/lib/swap/constants";

export function useSwapQuote(
  tokenAddress: string | undefined,
  amountIn: string,
  mode: SwapMode,
  payToken: PayToken,
  slippage: number,
  enabled = true
) {
  const client = usePublicClient();
  const [quote, setQuote] = useState<SwapQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !enabled || !tokenAddress || !isValidTokenAddress(tokenAddress)) {
      setQuote(null);
      setError(tokenAddress && !isValidTokenAddress(tokenAddress) ? "Invalid token address" : null);
      return;
    }
    if (!amountIn || Number(amountIn) <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchSwapQuote({
        client,
        tokenAddress: tokenAddress as Address,
        amountIn,
        mode,
        payToken,
      });
      setQuote(result);
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "Failed to fetch quote");
    } finally {
      setLoading(false);
    }
  }, [client, tokenAddress, amountIn, mode, payToken, enabled]);

  useEffect(() => {
    const t = setTimeout(refresh, 400);
    return () => clearTimeout(t);
  }, [refresh, slippage]);

  return { quote, loading, error, refresh };
}
