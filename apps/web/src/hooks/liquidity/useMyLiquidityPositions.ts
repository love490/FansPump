"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { uniswapV2FactoryAbi, uniswapV2PairAbi, uniswapV2RouterAbi } from "@/lib/liquidity/abis";
import {
  getLiquidityPair,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { loadStoredLiquidityPositions, saveLiquidityPosition } from "@/lib/liquidity/my-liquidity-storage";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { opnChainConfig } from "@/lib/chain-config/opn";

const ZERO_PAIR = "0x0000000000000000000000000000000000000000";

function quoteCandidatesForPairId(
  pairId: LiquidityPairId,
  weth: Address,
  wopnExplicit: Address,
  usdt: Address
): Address[] {
  const seen = new Set<string>();
  const add = (addr: string) => {
    const lower = addr.toLowerCase();
    if (lower && lower !== ZERO_PAIR) seen.add(lower);
  };

  if (pairId === "USDT") {
    add(usdt);
  } else if (pairId === "WOPN") {
    add(wopnExplicit);
    add(weth);
  } else {
    add(weth);
    add(wopnExplicit);
  }

  return [...seen].map((s) => s as Address);
}

async function resolveDexFactory(client: PublicClient): Promise<Address> {
  try {
    return (await client.readContract({
      address: DEX_ROUTER_ADDRESS,
      abi: uniswapV2RouterAbi,
      functionName: "factory",
    })) as Address;
  } catch {
    return opnChainConfig.contracts.factory;
  }
}

export type MyLiquidityPosition = {
  tokenAddress: string;
  tokenSymbol: string;
  pairId: LiquidityPairId;
  pairLabel: string;
  lpToken: string;
  lpBalance: bigint;
  lpDecimals: number;
  /** On-chain balance not resolved yet (saved locally after add) */
  pending?: boolean;
};

async function resolvePairAddress(
  client: PublicClient,
  factory: Address,
  token: Address,
  quote: Address
): Promise<Address | null> {
  const pair = await client.readContract({
    address: factory,
    abi: uniswapV2FactoryAbi,
    functionName: "getPair",
    args: [token, quote],
  });
  if (!pair || pair.toLowerCase() === ZERO_PAIR) return null;
  return pair as Address;
}

async function readLpPosition(
  client: PublicClient,
  factory: Address,
  wallet: Address,
  tokenAddress: string,
  tokenSymbol: string,
  pairId: LiquidityPairId,
  quoteCandidates: Address[]
): Promise<MyLiquidityPosition | null> {
  if (!isValidTokenAddress(tokenAddress)) return null;
  const token = tokenAddress as Address;

  for (const quoteAddress of quoteCandidates) {
    const pair = await resolvePairAddress(client, factory, token, quoteAddress);
    if (!pair) continue;

    const [balance, decimals] = await Promise.all([
      client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "balanceOf", args: [wallet] }),
      client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "decimals" }).catch(() => 18),
    ]);

    if (balance === 0n) continue;

    const pairMeta = getLiquidityPair(pairId);
    saveLiquidityPosition({
      tokenAddress: token.toLowerCase(),
      tokenSymbol,
      pairId,
      pairSymbol: pairMeta.symbol,
      addedAt: new Date().toISOString(),
    });

    return {
      tokenAddress: token.toLowerCase(),
      tokenSymbol,
      pairId,
      pairLabel: pairMeta.symbol,
      lpToken: pair.toLowerCase(),
      lpBalance: balance,
      lpDecimals: Number(decimals),
    };
  }

  return null;
}

function storedToPendingPosition(stored: {
  tokenAddress: string;
  tokenSymbol: string;
  pairId: LiquidityPairId;
  pairSymbol: string;
}): MyLiquidityPosition {
  return {
    tokenAddress: stored.tokenAddress.toLowerCase(),
    tokenSymbol: stored.tokenSymbol,
    pairId: stored.pairId,
    pairLabel: stored.pairSymbol,
    lpToken: "",
    lpBalance: 0n,
    lpDecimals: 18,
    pending: true,
  };
}

export function useMyLiquidityPositions(walletAddress: string | undefined) {
  const client = usePublicClient();
  const { tokens: walletTokens } = useWalletLiquidityTokens(walletAddress);
  const [positions, setPositions] = useState<MyLiquidityPosition[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress || !client) {
      setPositions([]);
      return;
    }

    setLoading(true);
    try {
      const wallet = walletAddress as Address;
      const [weth, factory] = await Promise.all([
        readRouterWeth(client, DEX_ROUTER_ADDRESS),
        resolveDexFactory(client),
      ]);
      const usdt = opnChainConfig.contracts.usdt;
      const wopn = opnChainConfig.contracts.wopnExplicit;

      const candidates = new Map<string, { symbol: string; pairIds: Set<LiquidityPairId> }>();
      for (const t of walletTokens) {
        const addr = t.contractAddress.toLowerCase();
        const entry = candidates.get(addr) ?? { symbol: t.symbol, pairIds: new Set<LiquidityPairId>() };
        entry.symbol = t.symbol;
        candidates.set(addr, entry);
      }
      for (const stored of loadStoredLiquidityPositions()) {
        const addr = stored.tokenAddress.toLowerCase();
        const entry = candidates.get(addr) ?? { symbol: stored.tokenSymbol, pairIds: new Set<LiquidityPairId>() };
        entry.symbol = stored.tokenSymbol;
        entry.pairIds.add(stored.pairId);
        candidates.set(addr, entry);
      }

      const checks: Promise<MyLiquidityPosition | null>[] = [];
      for (const [addr, meta] of candidates) {
        const pairIds: LiquidityPairId[] =
          meta.pairIds.size > 0 ? [...meta.pairIds] : ["OPN", "WOPN", "USDT"];

        for (const pairId of pairIds) {
          const quotes = quoteCandidatesForPairId(pairId, weth, wopn, usdt);
          checks.push(readLpPosition(client, factory, wallet, addr, meta.symbol, pairId, quotes));
        }
      }

      const results = await Promise.all(checks);
      const merged = new Map<string, MyLiquidityPosition>();
      for (const pos of results) {
        if (!pos) continue;
        merged.set(`${pos.tokenAddress}:${pos.pairId}`, pos);
      }

      for (const stored of loadStoredLiquidityPositions()) {
        const key = `${stored.tokenAddress.toLowerCase()}:${stored.pairId}`;
        if (!merged.has(key)) {
          merged.set(key, storedToPendingPosition(stored));
        }
      }

      setPositions([...merged.values()].sort((a, b) => a.tokenSymbol.localeCompare(b.tokenSymbol)));
    } catch (e) {
      console.error("[my-liquidity] Failed to load positions:", e);
      const fallback = loadStoredLiquidityPositions().map(storedToPendingPosition);
      setPositions(fallback);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, client, walletTokens]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { positions, loading, refresh };
}
