import type { Address } from "viem";
import { opnChainConfig, getWopnAddress } from "@/lib/chain-config/opn";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export type LiquidityPairId = "OPN" | "WOPN" | "USDT" | "USDC";

export type LiquidityPair = {
  id: LiquidityPairId;
  label: string;
  symbol: string;
  isNative: boolean;
  address?: Address;
  decimals: number;
};

const BASE_LIQUIDITY_PAIRS: LiquidityPair[] = [
  {
    id: "OPN",
    label: "OPN (native)",
    symbol: "OPN",
    isNative: true,
    decimals: opnChainConfig.nativeCurrency.decimals,
  },
  {
    id: "WOPN",
    label: "WOPN",
    symbol: "WOPN",
    isNative: false,
    address: getWopnAddress(),
    decimals: 18,
  },
  {
    id: "USDT",
    label: "USDT",
    symbol: "USDT",
    isNative: false,
    address: opnChainConfig.contracts.usdt,
    decimals: opnChainConfig.tokenDecimals.usdt,
  },
];

function usdcLiquidityPair(): LiquidityPair | null {
  const addr = opnChainConfig.contracts.usdc;
  if (!addr || addr.toLowerCase() === ZERO.toLowerCase()) return null;
  return {
    id: "USDC",
    label: "USDC",
    symbol: "USDC",
    isNative: false,
    address: addr,
    decimals: opnChainConfig.tokenDecimals.usdc,
  };
}

export const LIQUIDITY_PAIR_OPTIONS: LiquidityPair[] = [
  ...BASE_LIQUIDITY_PAIRS,
  ...(usdcLiquidityPair() ? [usdcLiquidityPair()!] : []),
];

export function getLiquidityPair(id: LiquidityPairId): LiquidityPair {
  const pair = LIQUIDITY_PAIR_OPTIONS.find((p) => p.id === id);
  if (!pair) throw new Error(`Unknown pair: ${id}`);
  return pair;
}

export function pairConflictsWithToken(pair: LiquidityPair, tokenAddress: string): boolean {
  if (pair.isNative || !pair.address) return false;
  return pair.address.toLowerCase() === tokenAddress.toLowerCase();
}

export function parseLiquidityPairId(value: string | null | undefined): LiquidityPairId {
  if (value === "WOPN" || value === "USDT" || value === "USDC" || value === "OPN") return value;
  return "OPN";
}

export function quoteAddressForPairId(
  pairId: LiquidityPairId,
  routerWeth: string,
  wopnExplicit: string,
  usdt: string,
  usdc?: string
): string {
  if (pairId === "OPN") return routerWeth;
  if (pairId === "WOPN") return wopnExplicit;
  if (pairId === "USDC") return usdc ?? ZERO;
  return usdt;
}

export const LIQUIDITY_DEADLINE_SECONDS = 600;
