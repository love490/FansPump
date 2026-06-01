import type { Address } from "viem";

export type PaymentCurrency = "OPN" | "USDT" | "USDC";

export const PAYMENT_CURRENCIES: PaymentCurrency[] = ["OPN", "USDT", "USDC"];

export type PayToken = {
  id: string;
  symbol: string;
  address: Address | null;
  isNative: boolean;
  decimals: number;
};

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const USDT_ADDRESS = (process.env.NEXT_PUBLIC_USDT_ADDRESS ?? "") as Address;
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "") as Address;

export const OPN_PAY_TOKEN: PayToken = {
  id: "native",
  symbol: "OPN",
  address: null,
  isNative: true,
  decimals: 18,
};

export function getPaymentTokenConfig(currency: PaymentCurrency) {
  switch (currency) {
    case "OPN":
      return { symbol: "OPN" as const, label: "OPN", address: null as Address | null, isNative: true, decimals: 18 };
    case "USDT":
      return {
        symbol: "USDT" as const,
        label: "USDT",
        address: USDT_ADDRESS && USDT_ADDRESS !== ZERO ? USDT_ADDRESS : null,
        isNative: false,
        decimals: Number(process.env.NEXT_PUBLIC_USDT_DECIMALS ?? 6),
      };
    case "USDC":
      return {
        symbol: "USDC" as const,
        label: "USDC",
        address: USDC_ADDRESS && USDC_ADDRESS !== ZERO ? USDC_ADDRESS : null,
        isNative: false,
        decimals: Number(process.env.NEXT_PUBLIC_USDC_DECIMALS ?? 6),
      };
  }
}

export function isPaymentCurrencyConfigured(currency: PaymentCurrency): boolean {
  const cfg = getPaymentTokenConfig(currency);
  return cfg.isNative || !!cfg.address;
}

export function getBuiltinPayTokens(): PayToken[] {
  const tokens: PayToken[] = [OPN_PAY_TOKEN];
  for (const c of ["USDT", "USDC"] as const) {
    const cfg = getPaymentTokenConfig(c);
    if (cfg.address) {
      tokens.push({
        id: cfg.address.toLowerCase(),
        symbol: cfg.symbol,
        address: cfg.address,
        isNative: false,
        decimals: cfg.decimals,
      });
    }
  }
  return tokens;
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
