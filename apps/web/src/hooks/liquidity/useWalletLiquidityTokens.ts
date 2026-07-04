"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { apiUrl } from "@/lib/api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { getPopularRegistryTokens } from "@/lib/token-registry";
import { erc20Abi } from "@/lib/swap/abis";

export type WalletLiquidityToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  balance: bigint;
  decimals: number;
  isCreator: boolean;
};

type WalletTokenApiRow = {
  contractAddress: string;
  name: string;
  symbol: string;
  logoUrl?: string | null;
  balance: string;
  decimals: number;
  isCreator?: boolean;
};

async function fetchWalletTokensFromApi(wallet: string): Promise<WalletLiquidityToken[]> {
  const chainId = getActiveChainId();
  const res = await fetch(
    apiUrl(`/api/wallet/${encodeURIComponent(wallet)}/tokens?chainId=${chainId}`),
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { tokens?: WalletTokenApiRow[] };
  return (data.tokens ?? [])
    .filter((t) => t.contractAddress?.startsWith("0x"))
    .map((t) => ({
      contractAddress: t.contractAddress.toLowerCase(),
      name: t.name || t.symbol || "Token",
      symbol: t.symbol || "TKN",
      logoUrl: t.logoUrl,
      balance: (() => {
        try {
          return BigInt(t.balance ?? "0");
        } catch {
          return 0n;
        }
      })(),
      decimals: t.decimals ?? 18,
      isCreator: Boolean(t.isCreator),
    }))
    .filter((t) => t.balance > 0n);
}

async function fetchRegistryBalances(
  wallet: Address,
  client: NonNullable<ReturnType<typeof usePublicClient>>
): Promise<WalletLiquidityToken[]> {
  const registry = getPopularRegistryTokens().filter(
    (t) => !t.isNative && t.contractAddress.startsWith("0x")
  );
  if (registry.length === 0) return [];

  const reads = registry.flatMap((t) => {
    const addr = t.contractAddress as Address;
    return [
      { address: addr, abi: erc20Abi, functionName: "balanceOf" as const, args: [wallet] as const },
      { address: addr, abi: erc20Abi, functionName: "decimals" as const },
    ];
  });

  const results = await client.multicall({ contracts: reads, allowFailure: true });
  const rows: WalletLiquidityToken[] = [];

  for (let i = 0; i < registry.length; i++) {
    const meta = registry[i];
    const balanceResult = results[i * 2];
    const decimalsResult = results[i * 2 + 1];
    const balance =
      balanceResult.status === "success" && typeof balanceResult.result === "bigint"
        ? balanceResult.result
        : 0n;
    if (balance <= 0n) continue;
    const decimals =
      decimalsResult.status === "success" && typeof decimalsResult.result === "number"
        ? Number(decimalsResult.result)
        : meta.decimals;

    rows.push({
      contractAddress: meta.contractAddress.toLowerCase(),
      name: meta.name,
      symbol: meta.symbol,
      logoUrl: meta.logoUrl,
      balance,
      decimals,
      isCreator: false,
    });
  }

  return rows;
}

function mergeWalletTokens(rows: WalletLiquidityToken[]): WalletLiquidityToken[] {
  const merged = new Map<string, WalletLiquidityToken>();
  for (const row of rows) {
    const key = row.contractAddress.toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, row);
      continue;
    }
    merged.set(key, {
      ...existing,
      name: existing.name || row.name,
      symbol: existing.symbol || row.symbol,
      logoUrl: existing.logoUrl ?? row.logoUrl,
      balance: existing.balance > row.balance ? existing.balance : row.balance,
      isCreator: existing.isCreator || row.isCreator,
    });
  }

  return [...merged.values()].sort((a, b) => {
    if (a.balance !== b.balance) return a.balance > b.balance ? -1 : 1;
    return a.symbol.localeCompare(b.symbol);
  });
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
      const wallet = walletAddress as Address;
      const [fromApi, fromRegistry] = await Promise.all([
        fetchWalletTokensFromApi(walletAddress),
        fetchRegistryBalances(wallet, client),
      ]);

      setTokens(mergeWalletTokens([...fromApi, ...fromRegistry]));
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
