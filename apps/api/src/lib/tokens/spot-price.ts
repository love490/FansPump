import { formatUnits, type Address } from "viem";
import { uniswapV2PairAbi } from "@/lib/liquidity/abis";
import { erc20Abi } from "@/lib/swap/abis";
import { getPublicClient } from "@/lib/rpc-client";
import { opnChainConfig, DEX_ROUTER_ADDRESS } from "@/lib/chain-config/opn";
import { resolveDexFactory } from "@/lib/liquidity/dex-factory";
import { findPairAddress, quoteCandidatesForPairId } from "@/lib/liquidity/pair-resolve";
import { readRouterWeth } from "@/lib/liquidity/router-weth";
import { isAddress } from "viem";

function priceFromReserves(
  tokenReserve: bigint,
  quoteReserve: bigint,
  tokenDecimals: number,
  quoteDecimals: number
): number | null {
  if (tokenReserve === 0n || quoteReserve === 0n) return null;
  const token = Number(formatUnits(tokenReserve, tokenDecimals));
  const quote = Number(formatUnits(quoteReserve, quoteDecimals));
  if (!Number.isFinite(token) || !Number.isFinite(quote) || token <= 0) return null;
  return quote / token;
}

async function readPairSpotPrice(
  client: ReturnType<typeof getPublicClient>,
  factory: Address,
  token: Address,
  quoteCandidates: Address[],
  quoteDecimals: number
): Promise<number | null> {
  const pair = await findPairAddress(client, factory, token, quoteCandidates);
  if (!pair) return null;

  const [token0, reserves, tokenDecimals] = await Promise.all([
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "token0" }),
    client.readContract({ address: pair, abi: uniswapV2PairAbi, functionName: "getReserves" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
  ]);

  const tokenIs0 = (token0 as string).toLowerCase() === token.toLowerCase();
  const tokenReserve = tokenIs0 ? reserves[0] : reserves[1];
  const quoteReserve = tokenIs0 ? reserves[1] : reserves[0];
  return priceFromReserves(
    tokenReserve,
    quoteReserve,
    Number(tokenDecimals),
    quoteDecimals
  );
}

export async function fetchWopnUsdPrice(): Promise<number | null> {
  const client = getPublicClient();
  const wopn = opnChainConfig.contracts.wopnExplicit as Address;
  const usdt = opnChainConfig.contracts.usdt as Address;
  const usdtDecimals = opnChainConfig.tokenDecimals.usdt;

  try {
    const factory = await resolveDexFactory(client);
    return await readPairSpotPrice(client, factory, wopn, [usdt], usdtDecimals);
  } catch {
    return null;
  }
}

export async function fetchTokenUsdPrice(tokenAddress: string): Promise<number | null> {
  if (!isAddress(tokenAddress)) return null;
  const client = getPublicClient();
  const token = tokenAddress.toLowerCase() as Address;
  const usdt = opnChainConfig.contracts.usdt as Address;
  const usdtDecimals = opnChainConfig.tokenDecimals.usdt;
  const wopn = opnChainConfig.contracts.wopnExplicit as Address;

  try {
    const [factory, weth] = await Promise.all([
      resolveDexFactory(client),
      readRouterWeth(client, DEX_ROUTER_ADDRESS),
    ]);

    const usdtPrice = await readPairSpotPrice(client, factory, token, [usdt], usdtDecimals);
    if (usdtPrice != null && usdtPrice > 0) return usdtPrice;

    const wopnQuotes = quoteCandidatesForPairId("WOPN", weth, wopn, usdt);
    const wopnPrice = await readPairSpotPrice(client, factory, token, wopnQuotes, 18);
    if (wopnPrice == null || wopnPrice <= 0) return null;

    const wopnUsd = await fetchWopnUsdPrice();
    return wopnUsd != null ? wopnPrice * wopnUsd : wopnPrice;
  } catch {
    return null;
  }
}

export async function fetchRegistrySpotPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    USDT: 1,
    USDC: 1,
  };

  const wopnUsd = await fetchWopnUsdPrice();
  if (wopnUsd != null && wopnUsd > 0) {
    prices.WOPN = wopnUsd;
    prices.OPN = wopnUsd;
  }

  const opnt = opnChainConfig.contracts.opnt.toLowerCase();
  const opntPrice = await fetchTokenUsdPrice(opnt);
  if (opntPrice != null && opntPrice > 0) {
    prices.OPNT = opntPrice;
  }

  return prices;
}

export async function fetchSpotPricesForAddresses(
  addresses: string[]
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const unique = [...new Set(addresses.filter((a) => isAddress(a)).map((a) => a.toLowerCase()))].slice(
    0,
    30
  );

  await Promise.all(
    unique.map(async (addr) => {
      const price = await fetchTokenUsdPrice(addr);
      if (price != null && price > 0) out[addr] = price;
    })
  );

  return out;
}
