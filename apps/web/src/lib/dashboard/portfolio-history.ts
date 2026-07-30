const STORAGE_PREFIX = "fanspump-portfolio-history";
const MAX_POINTS = 96;
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** Snapshots closer together than this are collapsed so a page refresh loop cannot flood history. */
const MIN_SAMPLE_GAP_MS = 15 * 60 * 1000;

export type PortfolioPoint = { t: number; usd: number };

export type PortfolioRange = "24h" | "7d" | "30d" | "all";

export const PORTFOLIO_RANGE_LABELS: Record<PortfolioRange, string> = {
  "24h": "24H",
  "7d": "7D",
  "30d": "30D",
  all: "All",
};

const RANGE_MS: Record<PortfolioRange, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: null,
};

function storageKey(wallet: string) {
  return `${STORAGE_PREFIX}:${wallet.toLowerCase()}`;
}

export function readPortfolioHistory(wallet: string | undefined): PortfolioPoint[] {
  if (!wallet || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(wallet));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is PortfolioPoint => {
        if (typeof p !== "object" || p === null) return false;
        const point = p as Partial<PortfolioPoint>;
        return Number.isFinite(point.t) && Number.isFinite(point.usd);
      })
      .sort((a, b) => a.t - b.t);
  } catch {
    return [];
  }
}

/**
 * Appends a net-worth sample for the wallet and returns the pruned history.
 *
 * History is local to the browser because the backend keeps no portfolio
 * snapshots, so change figures start accumulating from first visit.
 */
export function recordPortfolioSnapshot(
  wallet: string | undefined,
  usd: number,
  now = Date.now()
): PortfolioPoint[] {
  if (!wallet || typeof window === "undefined" || !Number.isFinite(usd)) return [];

  const history = readPortfolioHistory(wallet);
  const cutoff = now - HISTORY_WINDOW_MS;
  const kept = history.filter((p) => p.t >= cutoff);
  const last = kept[kept.length - 1];

  if (last && now - last.t < MIN_SAMPLE_GAP_MS) {
    kept[kept.length - 1] = { t: now, usd };
  } else {
    kept.push({ t: now, usd });
  }

  const pruned = kept.slice(-MAX_POINTS);
  try {
    window.localStorage.setItem(storageKey(wallet), JSON.stringify(pruned));
  } catch {
    // Storage full or blocked; change tracking is a non-critical enhancement.
  }
  return pruned;
}

export type PortfolioChange = {
  usd: number;
  percent: number;
  /** Baseline is younger than the requested range, so the figure covers less time. */
  partial: boolean;
  since: number;
};

export function computePortfolioChange(
  history: PortfolioPoint[],
  currentUsd: number,
  range: PortfolioRange = "24h",
  now = Date.now()
): PortfolioChange | null {
  if (history.length === 0) return null;

  const windowMs = RANGE_MS[range];
  const target = windowMs === null ? 0 : now - windowMs;

  const atOrBefore = history.filter((p) => p.t <= target);
  // A single sample is the reading just taken, so there is nothing to compare against yet.
  if (atOrBefore.length === 0 && history.length < 2) return null;

  const baseline = atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1] : history[0];
  if (!baseline) return null;

  const usd = currentUsd - baseline.usd;
  const percent = baseline.usd > 0 ? (usd / baseline.usd) * 100 : 0;

  return {
    usd,
    percent,
    partial: atOrBefore.length === 0,
    since: baseline.t,
  };
}

export function formatChangePercent(percent: number): string {
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

export function formatChangeUsd(usd: number): string {
  const sign = usd > 0 ? "+" : usd < 0 ? "-" : "";
  return `${sign}$${Math.abs(usd).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
