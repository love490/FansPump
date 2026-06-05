"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { uniswapV2FactoryAbi, uniswapV2PairAbi, uniswapV2RouterAbi } from "@/lib/liquidity/abis";
import {
  getLiquidityPair,
  quoteAddressForPairId,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { loadStoredLiquidityPositions } from "@/lib/liquidity/my-liquidity-storage";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { opnChainConfig } from "@/lib/chain-config/opn";

const ZERO_PAIR = "0x0000000000000000000000000000000000000000";

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
  wallet: Address,
  tokenAddress: string,
  tokenSymbol: string,
  pairId: LiquidityPairId,
  quoteAddress: Address
): Promise<MyLiquidityPosition | null> {
  if (!isValidTokenAddress(tokenAddress)) return null;
  const token = tokenAddress as Address;

  const factory = await client.readContract({
    address: DEX_ROUTER_ADDRESS,
    abi: uniswapV2RouterAbi,
    functionName: "factory",
  });

  const pair = await resolvePairAddress(client, factory as Address, token, quoteAddress);
  if (!pair) return null;

  const [balance, decimals] = await Promise.all([
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "balanceOf", args: [wallet] }),
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "decimals" }).catch(() => 18),
  ]);

  if (balance === 0n) return null;

  const pairMeta = getLiquidityPair(pairId);
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
      const weth = await readRouterWeth(client, DEX_ROUTER_ADDRESS);
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
          const quote = quoteAddressForPairId(pairId, weth, wopn, usdt) as Address;
          if (pairId === "WOPN" && quote.toLowerCase() === weth.toLowerCase()) continue;
          checks.push(readLpPosition(client, wallet, addr, meta.symbol, pairId, quote));
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
