export const SLIPPAGE_OPTIONS = [0.1, 0.5, 1, 2, 3] as const;
export const DEFAULT_SLIPPAGE = 0.5;
export const SWAP_DEADLINE_SECONDS = 1200;

export type SwapMode = "buy" | "sell" | "wrap" | "unwrap";
export type RouterType = "primary" | "uniswap";

export type { PaymentCurrency, PayToken } from "./payment-tokens";
export {
  PAYMENT_CURRENCIES,
  OPN_PAY_TOKEN,
  getPaymentTokenConfig,
  getBuiltinPayTokens,
  isPaymentCurrencyConfigured,
  isPayTokenConfigured,
  payTokenFromListedToken,
} from "./payment-tokens";
