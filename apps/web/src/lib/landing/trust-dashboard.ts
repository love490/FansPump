import type { PlatformStats } from "@/lib/tokens-api";

export type TrustDashboardMetrics = {
  trustIndex: number;
  verifiedProjects: number;
  liquidityLockedPct: number;
  ownershipRenouncedPct: number;
  healthScore: number;
  healthLabel: string;
  avgTrustScore: number;
  totalHolders: number;
  totalTokensCreated: number;
  totalLiquidityUsd: number;
  source: "live" | "mock";
};

const MOCK: Omit<TrustDashboardMetrics, "source"> = {
  trustIndex: 92,
  verifiedProjects: 1204,
  liquidityLockedPct: 68,
  ownershipRenouncedPct: 73,
  healthScore: 84,
  healthLabel: "Healthy & Growing",
  avgTrustScore: 84,
  totalHolders: 34_000,
  totalTokensCreated: 12_430,
  totalLiquidityUsd: 1_200_000,
};

export function buildTrustDashboardMetrics(live?: PlatformStats | null): TrustDashboardMetrics {
  const hasLive = Boolean(live && (live.tokenCount > 0 || live.verificationCount > 0));

  return {
    ...MOCK,
    verifiedProjects: live?.verificationCount && live.verificationCount > 0
      ? live.verificationCount
      : MOCK.verifiedProjects,
    totalTokensCreated:
      live?.tokenCount && live.tokenCount > 0 ? live.tokenCount : MOCK.totalTokensCreated,
    source: hasLive ? "live" : "mock",
  };
}

export function formatDashboardCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000).toLocaleString()}K`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}

export function formatDashboardCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}
