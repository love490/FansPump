"use client";

import { apiUrl } from "@/lib/api";

import { useCallback, useEffect, useState } from "react";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { uniswapV2PairAbi } from "@/lib/liquidity/abis";
import { getLiquidityPair, type LiquidityPairId } from "@/lib/liquidity/pair-tokens";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { findPairAddress, quoteCandidatesForPairId } from "@/lib/liquidity/pair-resolve";
import { loadStoredLiquidityPositions, saveLiquidityPosition } from "@/lib/liquidity/my-liquidity-storage";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { isValidTokenAddress } from "@/lib/swap/routerAdapter";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { opnChainConfig } from "@/lib/chain-config/opn";

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

type TokenCandidate = { contractAddress: string; symbol: string };

async function fetchCreatorTokens(wallet: string): Promise<TokenCandidate[]> {
  const chainId = getActiveChainId();
  const res = await fetch(
    `/api/tokens?creator=${encodeURIComponent(wallet)}&limit=100&chainId=${chainId}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { tokens?: TokenCandidate[] };
  return (data.tokens ?? []).map((t) => ({
    contractAddress: t.contractAddress.toLowerCase(),
    symbol: t.symbol,
  }));
}

async function readLpFromPair(
  client: PublicClient,
  wallet: Address,
  pair: Address,
  tokenAddress: string,
  tokenSymbol: string,
  pairId: LiquidityPairId
): Promise<MyLiquidityPosition | null> {
  const [balance, decimals] = await Promise.all([
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "balanceOf", args: [wallet] }),
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "decimals" }).catch(() => 18),
  ]);

  if (balance === 0n) return null;

  const pairMeta = getLiquidityPair(pairId);
  saveLiquidityPosition({
    walletAddress: wallet.toLowerCase(),
    tokenAddress: tokenAddress.toLowerCase(),
    tokenSymbol,
    pairId,
    pairSymbol: pairMeta.symbol,
    lpToken: pair.toLowerCase(),
    addedAt: new Date().toISOString(),
  });

  return {
    tokenAddress: tokenAddress.toLowerCase(),
    tokenSymbol,
    pairId,
    pairLabel: pairMeta.symbol,
    lpToken: pair.toLowerCase(),
    lpBalance: balance,
    lpDecimals: Number(decimals),
  };
}

async function readLpPosition(
  client: PublicClient,
  factory: Address,
  wallet: Address,
  tokenAddress: string,
  tokenSymbol: string,
  pairId: LiquidityPairId,
  quoteCandidates: Address[],
  knownLpToken?: string
): Promise<MyLiquidityPosition | null> {
  if (!isValidTokenAddress(tokenAddress)) return null;

  if (knownLpToken && isValidTokenAddress(knownLpToken)) {
    const fromKnown = await readLpFromPair(
      client,
      wallet,
      knownLpToken as Address,
      tokenAddress,
      tokenSymbol,
      pairId
    );
    if (fromKnown) return fromKnown;
  }

  const token = tokenAddress as Address;
  const pair = await findPairAddress(client, factory, token, quoteCandidates);
  if (!pair) return null;

  return readLpFromPair(client, wallet, pair, tokenAddress, tokenSymbol, pairId);
}

async function fetchLockedPositions(
  wallet: string,
  tokens: TokenCandidate[]
): Promise<MyLiquidityPosition[]> {
  const walletLower = wallet.toLowerCase();
  const positions: MyLiquidityPosition[] = [];

  await Promise.all(
    tokens.map(async (t) => {
      try {
        const res = await fetch(apiUrl(`/api/liquidity/${t.contractAddress}`));
        if (!res.ok) return;
        const data = (await res.json()) as {
          locks?: {
            creatorWallet: string;
            lpToken: string;
            amount: string;
          }[];
        };
        for (const lock of data.locks ?? []) {
          if (lock.creatorWallet.toLowerCase() !== walletLower) continue;
          const amount = BigInt(lock.amount);
          if (amount === 0n) continue;
          positions.push({
            tokenAddress: t.contractAddress,
            tokenSymbol: t.symbol,
            pairId: "OPN",
            pairLabel: "Locked LP",
            lpToken: lock.lpToken.toLowerCase(),
            lpBalance: amount,
            lpDecimals: 18,
          });
        }
      } catch {
        // skip token
      }
    })
  );

  return positions;
}

function storedToPendingPosition(stored: {
  tokenAddress: string;
  tokenSymbol: string;
  pairId: LiquidityPairId;
  pairSymbol: string;
  lpToken?: string;
}): MyLiquidityPosition {
  return {
    tokenAddress: stored.tokenAddress.toLowerCase(),
    tokenSymbol: stored.tokenSymbol,
    pairId: stored.pairId,
    pairLabel: stored.pairSymbol,
    lpToken: stored.lpToken?.toLowerCase() ?? "",
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

    const walletLower = walletAddress.toLowerCase();
    const storedEntries = loadStoredLiquidityPositions(walletLower);
    const storedPending = storedEntries.map(storedToPendingPosition);
    setPositions(storedPending);
    setLoading(true);

    try {
      const wallet = walletAddress as Address;
      const [weth, factory, creatorTokens] = await Promise.all([
        readRouterWeth(client, DEX_ROUTER_ADDRESS),
        resolveDexFactory(client),
        fetchCreatorTokens(walletAddress),
      ]);
      const usdt = opnChainConfig.contracts.usdt;
      const wopn = opnChainConfig.contracts.wopnExplicit;

      const candidates = new Map<string, { symbol: string; pairIds: Set<LiquidityPairId>; lpTokens: Map<LiquidityPairId, string> }>();

      const addCandidate = (addr: string, symbol: string, pairId?: LiquidityPairId, lpToken?: string) => {
        const key = addr.toLowerCase();
        const entry = candidates.get(key) ?? {
          symbol,
          pairIds: new Set<LiquidityPairId>(),
          lpTokens: new Map<LiquidityPairId, string>(),
        };
        entry.symbol = symbol;
        if (pairId) entry.pairIds.add(pairId);
        if (pairId && lpToken) entry.lpTokens.set(pairId, lpToken.toLowerCase());
        candidates.set(key, entry);
      };

      for (const t of walletTokens) {
        addCandidate(t.contractAddress, t.symbol);
      }
      for (const t of creatorTokens) {
        addCandidate(t.contractAddress, t.symbol);
      }
      for (const stored of storedEntries) {
        addCandidate(stored.tokenAddress, stored.tokenSymbol, stored.pairId, stored.lpToken);
      }

      const checks: Promise<MyLiquidityPosition | null>[] = [];

      for (const stored of storedEntries) {
        if (stored.lpToken && isValidTokenAddress(stored.lpToken)) {
          checks.push(
            readLpFromPair(
              client,
              wallet,
              stored.lpToken as Address,
              stored.tokenAddress,
              stored.tokenSymbol,
              stored.pairId
            )
          );
        }
      }
      for (const [addr, meta] of candidates) {
        const pairIds: LiquidityPairId[] =
          meta.pairIds.size > 0 ? [...meta.pairIds] : ["OPN", "WOPN", "USDT"];

        for (const pairId of pairIds) {
          const quotes = quoteCandidatesForPairId(pairId, weth, wopn, usdt);
          checks.push(
            readLpPosition(
              client,
              factory,
              wallet,
              addr,
              meta.symbol,
              pairId,
              quotes,
              meta.lpTokens.get(pairId)
            )
          );
        }
      }

      const [onChainResults, lockedPositions] = await Promise.all([
        Promise.all(checks),
        fetchLockedPositions(walletAddress, [...candidates.entries()].map(([addr, meta]) => ({
          contractAddress: addr,
          symbol: meta.symbol,
        }))),
      ]);

      const merged = new Map<string, MyLiquidityPosition>();
      for (const pos of onChainResults) {
        if (!pos) continue;
        merged.set(`${pos.tokenAddress}:${pos.pairId}`, pos);
      }
      for (const pos of lockedPositions) {
        const key = `${pos.tokenAddress}:lock:${pos.lpToken}`;
        merged.set(key, pos);
      }

      for (const stored of storedEntries) {
        const key = `${stored.tokenAddress.toLowerCase()}:${stored.pairId}`;
        if (!merged.has(key) && !merged.has(`${stored.tokenAddress.toLowerCase()}:lock:${stored.lpToken ?? ""}`)) {
          merged.set(key, storedToPendingPosition(stored));
        }
      }

      setPositions([...merged.values()].sort((a, b) => a.tokenSymbol.localeCompare(b.tokenSymbol)));
    } catch (e) {
      console.error("[my-liquidity] Failed to load positions:", e);
      const fallback = loadStoredLiquidityPositions(walletAddress.toLowerCase()).map(storedToPendingPosition);
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
