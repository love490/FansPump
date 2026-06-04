import type { Address } from "viem";
import { opnChainConfig, getWopnAddress } from "@/lib/chain-config/opn";

export type LiquidityPairId = "OPN" | "WOPN" | "USDT";

export type LiquidityPair = {
  id: LiquidityPairId;
  label: string;
  symbol: string;
  isNative: boolean;
  address?: Address;
  decimals: number;
};

export const LIQUIDITY_PAIR_OPTIONS: LiquidityPair[] = [
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

export function getLiquidityPair(id: LiquidityPairId): LiquidityPair {
  const pair = LIQUIDITY_PAIR_OPTIONS.find((p) => p.id === id);
  if (!pair) throw new Error(`Unknown pair: ${id}`);
  return pair;
}

export function pairConflictsWithToken(pair: LiquidityPair, tokenAddress: string): boolean {
  if (pair.isNative || !pair.address) return false;
  return pair.address.toLowerCase() === tokenAddress.toLowerCase();
}

export const LIQUIDITY_DEADLINE_SECONDS = 600;
