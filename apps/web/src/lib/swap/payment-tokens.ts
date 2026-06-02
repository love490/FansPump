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

// OPNChain testnet defaults (used when env vars are unset/zero).
// These are safe fallbacks to make the swap UI usable out-of-the-box.
const OPN_TESTNET_CHAIN_ID = 984;
const DEFAULT_TESTNET_USDT = "0x3e01b4d892E0D0A219eF8BBe7e260a6bc8d9B31b" as Address; // tUSDT

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? OPN_TESTNET_CHAIN_ID);

const USDT_ADDRESS_RAW = (process.env.NEXT_PUBLIC_USDT_ADDRESS ?? "") as Address;
const USDC_ADDRESS_RAW = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "") as Address;
const OPNV2_ADDRESS_RAW = (process.env.NEXT_PUBLIC_OPNV2_ADDRESS ?? "") as Address;

const USDT_ADDRESS =
  USDT_ADDRESS_RAW && USDT_ADDRESS_RAW !== ZERO
    ? USDT_ADDRESS_RAW
    : CHAIN_ID === OPN_TESTNET_CHAIN_ID
      ? DEFAULT_TESTNET_USDT
      : ("" as Address);

const USDC_ADDRESS = USDC_ADDRESS_RAW && USDC_ADDRESS_RAW !== ZERO ? USDC_ADDRESS_RAW : ("" as Address);
const OPNV2_ADDRESS =
  OPNV2_ADDRESS_RAW && OPNV2_ADDRESS_RAW !== ZERO ? OPNV2_ADDRESS_RAW : ("" as Address);

export const OPN_PAY_TOKEN: PayToken = {
  id: "native",
  symbol: "OPN",
  address: null,
  isNative: true,
  decimals: 18,
};

export const OPNV2_PAY_TOKEN: PayToken = {
  id: OPNV2_ADDRESS ? OPNV2_ADDRESS.toLowerCase() : "opnv2",
  symbol: "OPN V2",
  address: OPNV2_ADDRESS && OPNV2_ADDRESS !== ZERO ? OPNV2_ADDRESS : null,
  isNative: false,
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
  if (OPNV2_PAY_TOKEN.address) {
    tokens.push(OPNV2_PAY_TOKEN);
  }
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
