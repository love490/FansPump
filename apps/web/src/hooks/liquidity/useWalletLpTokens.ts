"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { uniswapV2PairAbi } from "@/lib/liquidity/abis";
import { erc20Abi } from "@/lib/swap/abis";
import { opnChainConfig, getWopnAddress } from "@/lib/chain-config/opn";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";

export type WalletLpToken = {
  lpToken: string;
  lpBalance: bigint;
  lpDecimals: number;
  token0: string;
  token1: string;
  symbol0: string;
  symbol1: string;
  /** Side that is not a base quote asset — the project token of the pair. */
  projectToken: string;
  projectSymbol: string;
  quoteSymbol: string;
  label: string;
};

function knownQuoteSymbols(): Map<string, string> {
  const map = new Map<string, string>();
  const add = (addr: string | undefined, symbol: string) => {
    if (!addr) return;
    const lower = addr.toLowerCase();
    if (!lower.startsWith("0x") || /^0x0+$/.test(lower)) return;
    map.set(lower, symbol);
  };

  add(getWopnAddress(), "WOPN");
  add(opnChainConfig.contracts.wopnExplicit, "WOPN");
  add(opnChainConfig.contracts.usdt, "USDT");
  add(opnChainConfig.contracts.usdc, "USDC");
  return map;
}

/**
 * ERC-20 balances that are actually Uniswap-V2 pair tokens.
 *
 * Adding liquidity can leave a wallet holding only the LP token, so pair
 * discovery driven by the underlying token balance misses those positions.
 */
export function useWalletLpTokens(walletAddress: string | undefined) {
  const client = usePublicClient();
  const { tokens: walletTokens, loading: tokensLoading } = useWalletLiquidityTokens(walletAddress);
  const [lpTokens, setLpTokens] = useState<WalletLpToken[]>([]);
  const [loading, setLoading] = useState(false);

  const candidateKey = useMemo(
    () => walletTokens.map((t) => t.contractAddress).join(","),
    [walletTokens]
  );

  const refresh = useCallback(async () => {
    if (!walletAddress || !client || walletTokens.length === 0) {
      setLpTokens([]);
      return;
    }

    setLoading(true);
    try {
      const wallet = walletAddress as Address;
      const candidates = walletTokens.map((t) => t.contractAddress as Address);

      const pairReads = candidates.flatMap((address) => [
        { address, abi: uniswapV2PairAbi, functionName: "token0" as const },
        { address, abi: uniswapV2PairAbi, functionName: "token1" as const },
      ]);

      const pairResults = await client.multicall({ contracts: pairReads, allowFailure: true });

      type Detected = { lpToken: Address; token0: string; token1: string };
      const detected: Detected[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const token0 = pairResults[i * 2];
        const token1 = pairResults[i * 2 + 1];
        if (token0?.status !== "success" || token1?.status !== "success") continue;
        if (typeof token0.result !== "string" || typeof token1.result !== "string") continue;
        detected.push({
          lpToken: candidates[i],
          token0: token0.result.toLowerCase(),
          token1: token1.result.toLowerCase(),
        });
      }

      if (detected.length === 0) {
        setLpTokens([]);
        return;
      }

      const sideAddresses = [
        ...new Set(detected.flatMap((d) => [d.token0, d.token1])),
      ] as string[];

      const metaReads = [
        ...detected.flatMap((d) => [
          { address: d.lpToken, abi: uniswapV2PairAbi, functionName: "balanceOf" as const, args: [wallet] as const },
          { address: d.lpToken, abi: uniswapV2PairAbi, functionName: "decimals" as const },
        ]),
        ...sideAddresses.map((address) => ({
          address: address as Address,
          abi: erc20Abi,
          functionName: "symbol" as const,
        })),
      ];

      const metaResults = await client.multicall({ contracts: metaReads, allowFailure: true });

      const quotes = knownQuoteSymbols();
      const symbolByAddress = new Map<string, string>();
      const symbolOffset = detected.length * 2;

      sideAddresses.forEach((address, index) => {
        const result = metaResults[symbolOffset + index];
        const onChain =
          result?.status === "success" && typeof result.result === "string" ? result.result : null;
        symbolByAddress.set(address, onChain || quotes.get(address) || "TOKEN");
      });

      const rows: WalletLpToken[] = [];

      detected.forEach((d, index) => {
        const balanceResult = metaResults[index * 2];
        const decimalsResult = metaResults[index * 2 + 1];

        const lpBalance =
          balanceResult?.status === "success" && typeof balanceResult.result === "bigint"
            ? balanceResult.result
            : 0n;
        if (lpBalance <= 0n) return;

        const lpDecimals =
          decimalsResult?.status === "success" && decimalsResult.result != null
            ? Number(decimalsResult.result)
            : 18;

        const symbol0 = symbolByAddress.get(d.token0) ?? "TOKEN";
        const symbol1 = symbolByAddress.get(d.token1) ?? "TOKEN";

        // Prefer showing the project token first, quote asset second.
        const zeroIsQuote = quotes.has(d.token0);
        const oneIsQuote = quotes.has(d.token1);
        const projectFirst = oneIsQuote || !zeroIsQuote;

        const projectToken = projectFirst ? d.token0 : d.token1;
        const projectSymbol = projectFirst ? symbol0 : symbol1;
        const quoteSymbol = projectFirst ? symbol1 : symbol0;

        rows.push({
          lpToken: d.lpToken.toLowerCase(),
          lpBalance,
          lpDecimals,
          token0: d.token0,
          token1: d.token1,
          symbol0,
          symbol1,
          projectToken,
          projectSymbol,
          quoteSymbol,
          label: `${projectSymbol} / ${quoteSymbol}`,
        });
      });

      rows.sort((a, b) => (a.lpBalance === b.lpBalance ? 0 : a.lpBalance > b.lpBalance ? -1 : 1));
      setLpTokens(rows);
    } catch {
      setLpTokens([]);
    } finally {
      setLoading(false);
    }
    // `candidateKey` tracks wallet token identity without re-running on array identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, client, candidateKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { lpTokens, loading: loading || tokensLoading, refresh };
}
