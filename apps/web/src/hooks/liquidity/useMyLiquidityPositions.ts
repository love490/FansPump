"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { uniswapV2FactoryAbi, uniswapV2PairAbi, uniswapV2RouterAbi } from "@/lib/liquidity/abis";
import { erc20Abi } from "@/lib/swap/abis";
import { getLiquidityPair, type LiquidityPairId } from "@/lib/liquidity/pair-tokens";
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
      let weth: Address;
      try {
        weth = (await client.readContract({
          address: DEX_ROUTER_ADDRESS,
          abi: uniswapV2RouterAbi,
          functionName: "WOPN",
        })) as Address;
      } catch {
        weth = (await client.readContract({
          address: DEX_ROUTER_ADDRESS,
          abi: uniswapV2RouterAbi,
          functionName: "WETH",
        })) as Address;
      }

      const usdt = opnChainConfig.contracts.usdt;
      const wopn = opnChainConfig.contracts.wopnExplicit;

      const candidates = new Map<string, string>();
      for (const t of walletTokens) {
        candidates.set(t.contractAddress.toLowerCase(), t.symbol);
      }
      for (const stored of loadStoredLiquidityPositions()) {
        if (!candidates.has(stored.tokenAddress.toLowerCase())) {
          candidates.set(stored.tokenAddress.toLowerCase(), stored.tokenSymbol);
        }
      }

      const checks: Promise<MyLiquidityPosition | null>[] = [];
      for (const [addr, symbol] of candidates) {
        checks.push(readLpPosition(client, wallet, addr, symbol, "OPN", weth));
        if (wopn.toLowerCase() !== weth.toLowerCase()) {
          checks.push(readLpPosition(client, wallet, addr, symbol, "WOPN", wopn));
        }
        checks.push(readLpPosition(client, wallet, addr, symbol, "USDT", usdt));
      }

      const results = await Promise.all(checks);
      const merged = new Map<string, MyLiquidityPosition>();
      for (const pos of results) {
        if (!pos) continue;
        merged.set(`${pos.tokenAddress}:${pos.pairId}`, pos);
      }
      setPositions([...merged.values()].sort((a, b) => a.tokenSymbol.localeCompare(b.tokenSymbol)));
    } catch (e) {
      console.error("[my-liquidity] Failed to load positions:", e);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, client, walletTokens]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { positions, loading, refresh };
}
