import { formatUnits } from "viem";

export type BalanceDisplayCurrency = "OPN" | "USD";

const STORAGE_KEY = "fanspump-dashboard-balance-currency";

export function getStoredBalanceCurrency(): BalanceDisplayCurrency {
  if (typeof window === "undefined") return "USD";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "OPN" || stored === "USD" ? stored : "USD";
}

export function storeBalanceCurrency(currency: BalanceDisplayCurrency) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, currency);
}

export function envOpnUsdRate(): number | null {
  const raw = (process.env.NEXT_PUBLIC_OPN_USD_PRICE ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Drop broken router quotes that would blow up portfolio totals. */
export function sanitizeUsdQuote(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 1e12) return 0;
  return value;
}

function compactNumber(value: number, digits = 2): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(digits)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(digits)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(digits)}M`;
  if (value >= 1e4) return `${(value / 1e3).toFixed(1)}K`;
  if (value >= 1000) return `${(value / 1e3).toFixed(digits)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatCompactUsd(value: number): string {
  const v = sanitizeUsdQuote(value);
  if (v <= 0) return "$0.00";
  if (v >= 1000) return `$${compactNumber(v, 2)}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  if (v >= 0.0001) return `$${v.toFixed(6)}`;
  return `$${v.toExponential(2)}`;
}

export function formatTokenAmount(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1000) return compactNumber(value, 2);
  if (value >= 1) {
    return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
  }
  if (value >= 0.0001) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  return value.toExponential(2);
}

export function formatCompactOpn(value: number): string {
  if (!Number.isFinite(value)) return "0 OPN";
  return `${formatTokenAmount(value)} OPN`;
}

export function formatBalanceTotal(value: number, currency: BalanceDisplayCurrency): string {
  if (!Number.isFinite(value)) return currency === "USD" ? "$0.00" : "0 OPN";
  if (currency === "USD") return formatCompactUsd(value);
  return formatCompactOpn(value);
}

export function bigintToFloat(value: bigint, decimals: number): number {
  try {
    return Number(formatUnits(value, decimals));
  } catch {
    return 0;
  }
}

export type PortfolioAsset = {
  symbol: string;
  name: string;
  amount: number;
  opnValue: number;
  usdValue: number;
  decimals?: number;
  contractAddress?: string | null;
  logoUrl?: string | null;
  isNative?: boolean;
  /** Liquidity pool LP token */
  isLp?: boolean;
  /** Project token address for project LP rows */
  projectTokenAddress?: string | null;
  /** Token created by this wallet (shown even at zero balance) */
  isCreator?: boolean;
};

export function sumPortfolio(assets: PortfolioAsset[]) {
  return assets.reduce(
    (acc, asset) => ({
      opn: acc.opn + asset.opnValue,
      usd: acc.usd + asset.usdValue,
    }),
    { opn: 0, usd: 0 }
  );
}
