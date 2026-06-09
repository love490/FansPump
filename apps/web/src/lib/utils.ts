import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTaxBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

/** Compact number for MC / volume (e.g. 1.2K, 3.4M). */
export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) return `${trimTrailingZero(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${trimTrailingZero(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trimTrailingZero(n / 1_000)}K`;
  if (n >= 1) return n.toFixed(n < 10 ? 2 : 0).replace(/\.?0+$/, "");
  return n.toFixed(2);
}

function trimTrailingZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** Short relative time: 5s, 12m, 3h, 2d, 1yr. */
export function formatTimeAgo(iso: string | Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d`;
  const years = Math.floor(days / 365);
  return `${years}yr`;
}
