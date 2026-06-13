"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { uniswapV2PairAbi } from "@/lib/liquidity/abis";
import { findPairAddress } from "@/lib/liquidity/pair-resolve";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { DEX_ROUTER_ADDRESS } from "@/lib/wagmi";
import { opnChainConfig } from "@/lib/chain-config/opn";

export type BasePoolLpId = "opn-usdt" | "opn-usdc";

export type BasePoolLpPosition = {
  poolId: BasePoolLpId;
  pairLabel: string;
  lpToken: string;
  lpBalance: bigint;
  lpDecimals: number;
};

function envUsdcAddress(): Address | null {
  const raw = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "").trim().toLowerCase();
  if (!raw || raw === "0x0000000000000000000000000000000000000000") return null;
  return raw as Address;
}

async function readBasePoolLp(
  client: PublicClient,
  wallet: Address,
  poolId: BasePoolLpId,
  pairLabel: string,
  quoteToken: Address
): Promise<BasePoolLpPosition | null> {
  const factory = await resolveDexFactory(client);
  const weth = await readRouterWeth(client, DEX_ROUTER_ADDRESS);
  const pair = await findPairAddress(client, factory, weth, [quoteToken]);
  if (!pair) return null;

  const [balance, decimals] = await Promise.all([
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "balanceOf", args: [wallet] }),
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "decimals" }).catch(() => 18),
  ]);

  if (balance === 0n) return null;

  return {
    poolId,
    pairLabel,
    lpToken: pair.toLowerCase(),
    lpBalance: balance,
    lpDecimals: Number(decimals),
  };
}

export function useBasePoolLpPositions(walletAddress: string | undefined) {
  const client = usePublicClient();
  const [positions, setPositions] = useState<BasePoolLpPosition[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!walletAddress || !client) {
      setPositions([]);
      return;
    }

    setLoading(true);
    try {
      const wallet = walletAddress as Address;
      const usdt = opnChainConfig.contracts.usdt;
      const usdc = envUsdcAddress();

      const checks: Promise<BasePoolLpPosition | null>[] = [
        readBasePoolLp(client, wallet, "opn-usdt", "OPN/USDT", usdt),
      ];

      if (usdc) {
        checks.push(readBasePoolLp(client, wallet, "opn-usdc", "OPN/USDC", usdc));
      }

      const results = await Promise.all(checks);
      setPositions(results.filter((p): p is BasePoolLpPosition => p !== null));
    } catch (e) {
      console.error("[base-pool-lp] Failed to load positions:", e);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { positions, loading, refresh };
}
