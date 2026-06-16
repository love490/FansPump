"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address, PublicClient } from "viem";
import { formatUnits } from "viem";
import { useBalance, usePublicClient } from "wagmi";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { erc20Abi } from "@/lib/swap/abis";
import { getRouterAddress } from "@/lib/swap/routerAdapter";
import { getBuiltinPayTokens, type PayToken } from "@/lib/swap/payment-tokens";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { useWalletLiquidityTokens } from "@/hooks/liquidity/useWalletLiquidityTokens";
import {
  bigintToFloat,
  sumPortfolio,
  type PortfolioAsset,
} from "@/lib/dashboard/wallet-balance";
import {
  DEFAULT_OPN_USD,
  fetchOpnUsdRate,
  fetchTokenUsdValue,
} from "@/lib/dashboard/token-quotes";

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
  const client = usePublicClient();
  const { data: nativeBalance, isLoading: nativeLoading } = useBalance({ address: walletAddress });
  const { tokens: walletTokens, loading: walletTokensLoading } = useWalletLiquidityTokens(walletAddress);

  const [payBalances, setPayBalances] = useState<Record<string, bigint>>({});
  const [payLoading, setPayLoading] = useState(false);
  const [opnUsdRate, setOpnUsdRate] = useState(DEFAULT_OPN_USD);
  const [rateLoading, setRateLoading] = useState(false);
  const [tokenUsdMap, setTokenUsdMap] = useState<Record<string, number>>({});
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
    if (!client || !walletAddress || walletTokens.length === 0) {
      setTokenUsdMap({});
      return;
    }

    const router = getRouterAddress("primary");
    const usdt = opnChainConfig.contracts.usdt;
    const wopn = opnChainConfig.contracts.wopn;
    if (!router || router === "0x0000000000000000000000000000000000000000" || !usdt) {
      setTokenUsdMap({});
      return;
    }

    let cancelled = false;
    setQuotesLoading(true);

    (async () => {
      const priced: Record<string, number> = {};
      const withBalance = walletTokens.filter((t) => t.balance > 0n);
      for (const token of withBalance.slice(0, 20)) {
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
      if (!cancelled) setTokenUsdMap(priced);
    })()
      .catch(() => {
        if (!cancelled) setTokenUsdMap({});
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, client, walletTokens]);

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
      });
    }

    for (const token of payTokens) {
      const raw = payBalances[token.id] ?? 0n;
      if (raw <= 0n) continue;
      const amount = bigintToFloat(raw, token.decimals);
      const upper = token.symbol.toUpperCase();
      const isStable = upper === "USDT" || upper === "USDC";
      const isWrappedOpn = upper === "WOPN" || upper === "OPNT";
      rows.push({
        symbol: token.symbol,
        name: token.symbol,
        amount,
        opnValue: isStable ? amount / rate : isWrappedOpn ? amount : amount / rate,
        usdValue: isStable ? amount : amount * rate,
      });
    }

    for (const token of walletTokens) {
      if (token.balance <= 0n) continue;
      const addr = token.contractAddress.toLowerCase();
      if (payTokens.some((p) => p.address?.toLowerCase() === addr)) continue;
      const amount = bigintToFloat(token.balance, token.decimals);
      const usdValue = tokenUsdMap[addr] ?? 0;
      rows.push({
        symbol: token.symbol,
        name: token.name,
        amount,
        opnValue: usdValue > 0 ? usdValue / rate : 0,
        usdValue,
      });
    }

    return rows;
  }, [nativeBalance, payBalances, payTokens, walletTokens, tokenUsdMap, opnUsdRate]);

  const totals = useMemo(() => sumPortfolio(assets), [assets]);

  const loading =
    nativeLoading || payLoading || walletTokensLoading || rateLoading || quotesLoading;

  return {
    assets,
    totals,
    opnUsdRate,
    tokenUsdMap,
    loading,
    refresh: refreshPayBalances,
  };
}
