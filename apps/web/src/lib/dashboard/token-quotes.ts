import type { Address, PublicClient } from "viem";
import { formatUnits, parseEther } from "viem";
import { opnDexRouterAbi } from "@/lib/swap/abis";
import { getRouterAddress } from "@/lib/swap/routerAdapter";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { envOpnUsdRate, sanitizeUsdQuote } from "@/lib/dashboard/wallet-balance";

export const DEFAULT_OPN_USD = 0.25;

export async function fetchOpnUsdRate(client: PublicClient): Promise<number> {
  const fromEnv = envOpnUsdRate();
  if (fromEnv) return fromEnv;

  const usdt = opnChainConfig.contracts.usdt;
  const router = getRouterAddress("primary");
  const wopn = opnChainConfig.contracts.wopn;

  if (!usdt || !router || router === "0x0000000000000000000000000000000000000000") {
    return DEFAULT_OPN_USD;
  }

  try {
    const amounts = await client.readContract({
      address: router,
      abi: opnDexRouterAbi,
      functionName: "getAmountsOut",
      args: [parseEther("1"), [wopn, usdt]],
    });
    const usdtOut = Number(formatUnits(amounts[amounts.length - 1]!, opnChainConfig.tokenDecimals.usdt));
    return sanitizeUsdQuote(usdtOut > 0 ? usdtOut : DEFAULT_OPN_USD) || DEFAULT_OPN_USD;
  } catch {
    return DEFAULT_OPN_USD;
  }
}

export async function fetchTokenUsdValue(
  client: PublicClient,
  tokenAddress: Address,
  amount: bigint,
  wopn: Address,
  usdt: Address,
  router: Address
): Promise<number> {
  if (amount <= 0n) return 0;
  try {
    const amounts = await client.readContract({
      address: router,
      abi: opnDexRouterAbi,
      functionName: "getAmountsOut",
      args: [amount, [tokenAddress, wopn, usdt]],
    });
    return sanitizeUsdQuote(
      Number(formatUnits(amounts[amounts.length - 1]!, opnChainConfig.tokenDecimals.usdt))
    );
  } catch {
    try {
      const amounts = await client.readContract({
        address: router,
        abi: opnDexRouterAbi,
        functionName: "getAmountsOut",
        args: [amount, [tokenAddress, usdt]],
      });
      return sanitizeUsdQuote(
        Number(formatUnits(amounts[amounts.length - 1]!, opnChainConfig.tokenDecimals.usdt))
      );
    } catch {
      return 0;
    }
  }
}

export async function quoteLpTokenUsd(
  client: PublicClient,
  lpToken: Address,
  lpBalance: bigint
): Promise<number> {
  const router = getRouterAddress("primary");
  const usdt = opnChainConfig.contracts.usdt;
  const wopn = opnChainConfig.contracts.wopn;
  if (!router || router === "0x0000000000000000000000000000000000000000" || !usdt) {
    return 0;
  }
  return fetchTokenUsdValue(client, lpToken, lpBalance, wopn, usdt, router);
}
