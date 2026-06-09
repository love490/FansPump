"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address, PublicClient } from "viem";
import { formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { DEAD_BURN_ADDRESS, LIQUIDITY_LOCKER_ADDRESS } from "@/lib/liquidity/constants";
import { uniswapV2FactoryAbi, uniswapV2PairAbi, uniswapV2RouterAbi } from "@/lib/liquidity/abis";
import { LIQUIDITY_PAIR_OPTIONS, quoteAddressForPairId, type LiquidityPairId } from "@/lib/liquidity/pair-tokens";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";

const ZERO_PAIR = "0x0000000000000000000000000000000000000000";

export type PairLiquidityStat = {
  pairId: LiquidityPairId;
  label: string;
  pairAddress: string;
  tokenReserve: string;
  quoteReserve: string;
  quoteSymbol: string;
  tvlQuote: string;
  lockedPct: number;
  burnedPct: number;
  totalLpSupply: string;
  lockedLpAmount: string;
  burnedLpAmount: string;
};

export type TokenLiquidityStats = {
  pairs: PairLiquidityStat[];
  totalUsdtEstimate: string;
  fullySecured: boolean;
};

function isZeroAddress(a: string) {
  return a.toLowerCase() === ZERO_PAIR;
}

async function readPairStat(
  client: PublicClient,
  factory: Address,
  token: Address,
  pairId: LiquidityPairId,
  quote: Address,
  tokenDecimals: number,
  extraBurnAddresses: Address[] = []
): Promise<PairLiquidityStat | null> {
  const pairAddr = await client.readContract({
    address: factory,
    abi: uniswapV2FactoryAbi,
    functionName: "getPair",
    args: [token, quote],
  });

  if (!pairAddr || isZeroAddress(String(pairAddr))) return null;

  const pair = pairAddr as Address;
  const meta = LIQUIDITY_PAIR_OPTIONS.find((p) => p.id === pairId)!;

  const burnTargets = [
    DEAD_BURN_ADDRESS,
    ...extraBurnAddresses.filter((a) => a.toLowerCase() !== DEAD_BURN_ADDRESS.toLowerCase()),
  ];

  const [token0, reserves, totalSupply, lpDecimals, lockedBal, ...burnBals] = await Promise.all([
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "token0" }),
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "getReserves" }),
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "totalSupply" }),
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "decimals" }),
    client.readContract({
      address: pair,
      abi: uniswapV2PairAbi,
      functionName: "balanceOf",
      args: [LIQUIDITY_LOCKER_ADDRESS],
    }).catch(() => 0n),
    ...burnTargets.map((addr) =>
      client
        .readContract({
          address: pair,
          abi: uniswapV2PairAbi,
          functionName: "balanceOf",
          args: [addr],
        })
        .catch(() => 0n)
    ),
  ]);

  const burnedBal = (burnBals as bigint[]).reduce((sum, b) => sum + b, 0n);

  const tokenIs0 = (token0 as string).toLowerCase() === token.toLowerCase();
  const tokenReserve = tokenIs0 ? reserves[0] : reserves[1];
  const quoteReserve = tokenIs0 ? reserves[1] : reserves[0];
  const quoteDecimals = meta.decimals;

  const supply = totalSupply as bigint;
  const decimals = Number(lpDecimals);
  const lockedPct = supply > 0n ? Number((lockedBal * 10_000n) / supply) / 100 : 0;
  const burnedPct = supply > 0n ? Number((burnedBal * 10_000n) / supply) / 100 : 0;

  const tvlQuote = formatUnits(quoteReserve * 2n, quoteDecimals);

  return {
    pairId,
    label: `${meta.symbol}`,
    pairAddress: pair.toLowerCase(),
    tokenReserve: formatUnits(tokenReserve, tokenDecimals),
    quoteReserve: formatUnits(quoteReserve, quoteDecimals),
    quoteSymbol: meta.symbol,
    tvlQuote,
    lockedPct,
    burnedPct,
    totalLpSupply: formatUnits(supply, decimals),
    lockedLpAmount: formatUnits(lockedBal as bigint, decimals),
    burnedLpAmount: formatUnits(burnedBal, decimals),
  };
}

export function useTokenLiquidityStats(tokenAddress: string | undefined, tokenDecimals = 18) {
  const client = usePublicClient();
  const [stats, setStats] = useState<TokenLiquidityStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!client || !tokenAddress || !isValidTokenAddress(tokenAddress)) {
      setStats(null);
      return;
    }

    setLoading(true);
    try {
      const token = tokenAddress as Address;
      const factory = await resolveDexFactory(client);

      const weth = await readRouterWeth(client, DEX_ROUTER_ADDRESS);
      const pairIds: LiquidityPairId[] = ["OPN", "USDT"];

      let burnAddresses: Address[] = [];
      try {
        const res = await fetch(`/api/liquidity/${tokenAddress}`);
        if (res.ok) {
          const data = (await res.json()) as { burns?: { burnAddress: string }[] };
          burnAddresses = [
            ...new Set(
              (data.burns ?? [])
                .map((b) => b.burnAddress?.toLowerCase())
                .filter((a): a is string => !!a && /^0x[a-f0-9]{40}$/.test(a))
            ),
          ] as Address[];
        }
      } catch {
        // non-fatal — fall back to dead-address burn check only
      }

      const results = await Promise.all(
        pairIds.map((pairId) => {
          const quote = quoteAddressForPairId(
            pairId,
            weth,
            opnChainConfig.contracts.wopnExplicit,
            opnChainConfig.contracts.usdt
          ) as Address;
          return readPairStat(client, factory, token, pairId, quote, tokenDecimals, burnAddresses);
        })
      );

      const pairs = results.filter((p): p is PairLiquidityStat => p !== null);

      let totalUsdt = 0;
      for (const p of pairs) {
        const n = Number(p.tvlQuote);
        if (Number.isFinite(n)) {
          if (p.quoteSymbol === "USDT") totalUsdt += n;
          // OPN pair: rough 1:1 placeholder until price oracle — show OPN TVL separately
        }
      }

      const fullySecured =
        pairs.length > 0 &&
        pairs.every((p) => p.lockedPct + p.burnedPct >= 99.9);

      setStats({
        pairs,
        totalUsdtEstimate: totalUsdt > 0 ? totalUsdt.toFixed(4) : "0",
        fullySecured,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [client, tokenAddress, tokenDecimals]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
