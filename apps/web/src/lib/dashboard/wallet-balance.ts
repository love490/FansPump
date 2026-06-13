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

export function formatBalanceTotal(value: number, currency: BalanceDisplayCurrency): string {
  if (!Number.isFinite(value)) return currency === "USD" ? "$0.00" : "0 OPN";
  if (currency === "USD") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M OPN`;
  if (value >= 1) return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} OPN`;
  if (value >= 0.0001) return `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} OPN`;
  return `${value.toExponential(2)} OPN`;
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
