import type { Address } from "viem";
import {
  getRegistryPayTokens,
  registryToPayToken,
  type RegistryPayToken,
} from "@/lib/token-registry";
import { getPopularRegistryTokens } from "@/lib/token-registry";

export type PaymentCurrency = "OPN" | "WOPN" | "OPNT" | "USDT";

export const PAYMENT_CURRENCIES: PaymentCurrency[] = ["OPN", "WOPN", "OPNT", "USDT"];

export type PayToken = RegistryPayToken;

const payTokens = getRegistryPayTokens();

export const OPN_PAY_TOKEN: PayToken =
  payTokens.find((t) => t.isNative) ?? payTokens[0];

export function getBuiltinPayTokens(): PayToken[] {
  return payTokens.filter((t) => t.isNative || !!t.address);
}

export function getPaymentTokenConfig(currency: PaymentCurrency) {
  const token = getPopularRegistryTokens().find((t) => t.symbol === currency);
  if (!token) return null;
  return registryToPayToken(token);
}

export function isPaymentCurrencyConfigured(currency: PaymentCurrency): boolean {
  const cfg = getPaymentTokenConfig(currency);
  return !!cfg && (cfg.isNative || !!cfg.address);
}

export function payTokenFromListedToken(token: {
  contractAddress: string;
  symbol: string;
  decimals?: number;
}): PayToken {
  return {
    id: token.contractAddress.toLowerCase(),
    symbol: token.symbol,
    address: token.contractAddress.toLowerCase() as Address,
    isNative: false,
    decimals: token.decimals ?? 18,
  };
}

export function isPayTokenConfigured(payToken: PayToken): boolean {
  return payToken.isNative || !!payToken.address;
}
