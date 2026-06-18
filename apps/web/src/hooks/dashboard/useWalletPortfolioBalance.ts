"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { formatUnits } from "viem";
import { useBalance, usePublicClient } from "wagmi";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { erc20Abi } from "@/lib/swap/abis";
import { getRouterAddress } from "@/lib/swap/routerAdapter";
import { getBuiltinPayTokens, type PayToken } from "@/lib/swap/payment-tokens";
import { getActiveChainId, opnChainConfig } from "@/lib/chain-config/opn";
import { getRegistryTokenByAddress } from "@/lib/token-registry";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import {
  bigintToFloat,
  sumPortfolio,
  type PortfolioAsset,
} from "@/lib/dashboard/wallet-balance";
import {
  DEFAULT_OPN_USD,
  fetchOpnUsdRate,
  fetchTokenUsdValue,
  quoteLpTokenUsd,
} from "@/lib/dashboard/token-quotes";
import { fetchMyTokens } from "@/lib/token-register";
import { tokenQueryKeys } from "@/lib/tokens-api";

async function readPayTokenBalance(
  client: PublicClient,
  wallet: Address,
  token: PayToken
): Promise<bigint> {
  if (token.isNative || !token.address) return 0n;
  return client.readContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet],
  });
}

export function useWalletPortfolioBalance() {
  const { walletAddress } = useActiveWallet();
  const chainId = getActiveChainId();
  const client = usePublicClient();
  const { data: nativeBalance, isLoading: nativeLoading } = useBalance({ address: walletAddress });
  const { data: createdTokens = [], isLoading: createdLoading, refetch: refetchCreatedTokens } = useQuery({
    queryKey: tokenQueryKeys.myTokens(walletAddress ?? "", chainId),
    queryFn: () => fetchMyTokens(walletAddress!),
    enabled: Boolean(walletAddress),
    staleTime: 30_000,
  });
  const {
    tokens: walletTokens,
    loading: walletTokensLoading,
    refresh: refreshWalletTokens,
  } = useWalletLiquidityTokens(walletAddress);
  const {
    positions: lpPositions,
    loading: lpLoading,
    refresh: refreshLpPositions,
  } = useMyLiquidityPositions(walletAddress);
  const {
    positions: basePoolLps,
    loading: baseLpLoading,
    refresh: refreshBasePoolLps,
  } = useBasePoolLpPositions(walletAddress);

  const [payBalances, setPayBalances] = useState<Record<string, bigint>>({});
  const [payLoading, setPayLoading] = useState(false);
  const [opnUsdRate, setOpnUsdRate] = useState(DEFAULT_OPN_USD);
  const [rateLoading, setRateLoading] = useState(false);
  const [tokenUsdMap, setTokenUsdMap] = useState<Record<string, number>>({});
  const [lpUsdMap, setLpUsdMap] = useState<Record<string, number>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);

  const payTokens = useMemo(() => getBuiltinPayTokens().filter((t) => !t.isNative && t.address), []);

  const refreshPayBalances = useCallback(async () => {
    if (!walletAddress || !client) {
      setPayBalances({});
      return;
    }
    setPayLoading(true);
    try {
      const wallet = walletAddress as Address;
      const entries = await Promise.all(
        payTokens.map(async (token) => {
          const balance = await readPayTokenBalance(client, wallet, token);
          return [token.id, balance] as const;
        })
      );
      setPayBalances(Object.fromEntries(entries));
    } finally {
      setPayLoading(false);
    }
  }, [walletAddress, client, payTokens]);

  useEffect(() => {
    void refreshPayBalances();
  }, [refreshPayBalances]);

  useEffect(() => {
    if (!client) return;
    setRateLoading(true);
    fetchOpnUsdRate(client)
      .then(setOpnUsdRate)
      .finally(() => setRateLoading(false));
  }, [client]);

  useEffect(() => {
    if (!client || !walletAddress) {
      setTokenUsdMap({});
      setLpUsdMap({});
      return;
    }

    const router = getRouterAddress("primary");
    const usdt = opnChainConfig.contracts.usdt;
    const wopn = opnChainConfig.contracts.wopn;
    if (!router || router === "0x0000000000000000000000000000000000000000" || !usdt) {
      setTokenUsdMap({});
      setLpUsdMap({});
      return;
    }

    let cancelled = false;
    setQuotesLoading(true);

    (async () => {
      const priced: Record<string, number> = {};
      const lpPriced: Record<string, number> = {};
      const withBalance = walletTokens.filter((t) => t.balance > 0n);
      for (const token of withBalance.slice(0, 40)) {
        const usd = await fetchTokenUsdValue(
          client,
          token.contractAddress as Address,
          token.balance,
          wopn,
          usdt,
          router
        );
        priced[token.contractAddress.toLowerCase()] = usd;
      }

      const lpRows = [
        ...lpPositions.filter((p) => !p.pending && p.lpBalance > 0n),
        ...basePoolLps.filter((p) => p.lpBalance > 0n),
      ];
      for (const pos of lpRows) {
        const key = pos.lpToken.toLowerCase();
        if (lpPriced[key] !== undefined) continue;
        lpPriced[key] = await quoteLpTokenUsd(client, pos.lpToken as Address, pos.lpBalance);
      }

      if (!cancelled) {
        setTokenUsdMap(priced);
        setLpUsdMap(lpPriced);
      }
    })()
      .catch(() => {
        if (!cancelled) {
          setTokenUsdMap({});
          setLpUsdMap({});
        }
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, client, walletTokens, lpPositions, basePoolLps]);

  const assets = useMemo((): PortfolioAsset[] => {
    const rows: PortfolioAsset[] = [];
    const rate = opnUsdRate > 0 ? opnUsdRate : DEFAULT_OPN_USD;

    if (nativeBalance && nativeBalance.value > 0n) {
      const amount = bigintToFloat(nativeBalance.value, nativeBalance.decimals);
      rows.push({
        symbol: "OPN",
        name: "OPN",
        amount,
        opnValue: amount,
        usdValue: amount * rate,
        isNative: true,
        contractAddress: null,
      });
    }

    for (const token of payTokens) {
      const raw = payBalances[token.id] ?? 0n;
      if (raw <= 0n) continue;
      const amount = bigintToFloat(raw, token.decimals);
      const upper = token.symbol.toUpperCase();
      const isStable = upper === "USDT" || upper === "USDC";
      const isWrappedOpn = upper === "WOPN" || upper === "OPNT";
      const addr = token.address?.toLowerCase() ?? null;
      const registry = addr ? getRegistryTokenByAddress(addr) : undefined;
      rows.push({
        symbol: token.symbol,
        name: registry?.name ?? token.symbol,
        amount,
        opnValue: isStable ? amount / rate : isWrappedOpn ? amount : amount / rate,
        usdValue: isStable ? amount : isWrappedOpn ? amount * rate : amount * rate,
        contractAddress: addr,
        logoUrl: registry?.logoUrl,
      });
    }

    const seenAddresses = new Set(rows.map((r) => r.contractAddress?.toLowerCase()).filter(Boolean));

    for (const token of walletTokens) {
      if (token.balance <= 0n && !token.isCreator) continue;
      const addr = token.contractAddress.toLowerCase();
      if (payTokens.some((p) => p.address?.toLowerCase() === addr)) continue;
      if (seenAddresses.has(addr)) continue;
      const amount = bigintToFloat(token.balance, token.decimals);
      const usdValue = tokenUsdMap[addr] ?? 0;
      rows.push({
        symbol: token.symbol,
        name: token.name,
        amount,
        opnValue: usdValue > 0 ? usdValue / rate : 0,
        usdValue,
        contractAddress: addr,
        logoUrl: token.logoUrl,
        isCreator: token.isCreator,
      });
      seenAddresses.add(addr);
    }

    for (const pos of lpPositions) {
      if (pos.pending || pos.lpBalance <= 0n) continue;
      const lpKey = pos.lpToken.toLowerCase();
      if (seenAddresses.has(lpKey)) continue;
      const amount = bigintToFloat(pos.lpBalance, pos.lpDecimals);
      const label = `${pos.tokenSymbol}/${pos.pairLabel} LP`;
      const usdValue = lpUsdMap[lpKey] ?? 0;
      rows.push({
        symbol: label,
        name: label,
        amount,
        opnValue: usdValue > 0 ? usdValue / rate : 0,
        usdValue,
        contractAddress: lpKey,
        projectTokenAddress: pos.tokenAddress,
        isLp: true,
      });
      seenAddresses.add(lpKey);
    }

    for (const pos of basePoolLps) {
      if (pos.lpBalance <= 0n) continue;
      const lpKey = pos.lpToken.toLowerCase();
      if (seenAddresses.has(lpKey)) continue;
      const amount = bigintToFloat(pos.lpBalance, pos.lpDecimals);
      const label = `${pos.pairLabel} LP`;
      const usdValue = lpUsdMap[lpKey] ?? 0;
      rows.push({
        symbol: label,
        name: label,
        amount,
        opnValue: usdValue > 0 ? usdValue / rate : 0,
        usdValue,
        contractAddress: lpKey,
        isLp: true,
      });
      seenAddresses.add(lpKey);
    }

    for (const token of createdTokens) {
      const addr = token.contractAddress.toLowerCase();
      if (!addr.startsWith("0x") || seenAddresses.has(addr)) continue;
      rows.push({
        symbol: token.symbol,
        name: token.name,
        amount: 0,
        opnValue: 0,
        usdValue: 0,
        contractAddress: addr,
        logoUrl: token.logoUrl,
        isCreator: true,
      });
      seenAddresses.add(addr);
    }

    return rows;
  }, [
    nativeBalance,
    payBalances,
    payTokens,
    walletTokens,
    lpPositions,
    basePoolLps,
    tokenUsdMap,
    lpUsdMap,
    opnUsdRate,
    createdTokens,
  ]);

  const totals = useMemo(() => sumPortfolio(assets), [assets]);

  const loading =
    nativeLoading ||
    payLoading ||
    walletTokensLoading ||
    lpLoading ||
    baseLpLoading ||
    rateLoading ||
    quotesLoading ||
    createdLoading;

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshPayBalances(),
      refreshWalletTokens(),
      refreshLpPositions(),
      refreshBasePoolLps(),
      refetchCreatedTokens(),
    ]);
  }, [refreshPayBalances, refreshWalletTokens, refreshLpPositions, refreshBasePoolLps, refetchCreatedTokens]);

  return {
    assets,
    totals,
    opnUsdRate,
    tokenUsdMap,
    loading,
    refresh,
  };
}
