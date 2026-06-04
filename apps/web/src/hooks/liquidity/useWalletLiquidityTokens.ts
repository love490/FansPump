"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "@/lib/swap/abis";
import { getActiveChainId } from "@/lib/chain-config/opn";

export type WalletLiquidityToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  balance: bigint;
  decimals: number;
  isCreator: boolean;
};

type ApiToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
};

async function fetchTokenList(url: string): Promise<ApiToken[]> {
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { tokens?: ApiToken[] };
  return data.tokens ?? [];
}

export function useWalletLiquidityTokens(walletAddress: string | undefined) {
  const client = usePublicClient();
  const [tokens, setTokens] = useState<WalletLiquidityToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress || !client) {
      setTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const chainId = getActiveChainId();
      const creator = walletAddress.toLowerCase();

      const [created, recent, trending] = await Promise.all([
        fetchTokenList(`/api/tokens?creator=${encodeURIComponent(creator)}&limit=100&chainId=${chainId}`),
        fetchTokenList(`/api/tokens?section=new&limit=100&chainId=${chainId}`),
        fetchTokenList(`/api/tokens?section=trending&limit=50&chainId=${chainId}`),
      ]);

      const creatorSet = new Set(created.map((t) => t.contractAddress.toLowerCase()));
      const merged = new Map<string, ApiToken & { isCreator: boolean }>();

      for (const t of [...created, ...recent, ...trending]) {
        const addr = t.contractAddress.toLowerCase();
        if (!addr.startsWith("0x")) continue;
        merged.set(addr, {
          ...t,
          contractAddress: addr,
          isCreator: creatorSet.has(addr),
        });
      }

      const candidates = [...merged.values()];
      if (candidates.length === 0) {
        setTokens([]);
        return;
      }

      const reads = candidates.flatMap((t) => {
        const addr = t.contractAddress as Address;
        return [
          {
            address: addr,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [walletAddress as Address],
          },
          {
            address: addr,
            abi: erc20Abi,
            functionName: "decimals" as const,
          },
        ];
      });

      const results = await client.multicall({ contracts: reads, allowFailure: true });

      const enriched: WalletLiquidityToken[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const meta = candidates[i];
        const balanceResult = results[i * 2];
        const decimalsResult = results[i * 2 + 1];

        const balance =
          balanceResult.status === "success" && typeof balanceResult.result === "bigint"
            ? balanceResult.result
            : 0n;
        const decimals =
          decimalsResult.status === "success" && typeof decimalsResult.result === "number"
            ? Number(decimalsResult.result)
            : 18;

        if (balance > 0n || meta.isCreator) {
          enriched.push({
            contractAddress: meta.contractAddress,
            name: meta.name,
            symbol: meta.symbol,
            logoUrl: meta.logoUrl,
            balance,
            decimals,
            isCreator: meta.isCreator,
          });
        }
      }

      enriched.sort((a, b) => {
        if (a.isCreator !== b.isCreator) return a.isCreator ? -1 : 1;
        if (a.balance !== b.balance) return a.balance > b.balance ? -1 : 1;
        return a.symbol.localeCompare(b.symbol);
      });

      setTokens(enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wallet tokens");
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tokens, loading, error, refresh };
}
