import type { PlatformStats } from "@/lib/tokens-api";

/** Display keys — structured for future backend integration. */
export type EcosystemStatKey =
  | "tokensCreated"
  | "liquidityLocked"
  | "holders"
  | "volumeTraded"
  | "verifiedProjects";

export type EcosystemStatItem = {
  key: EcosystemStatKey;
  label: string;
  /** Formatted display value */
  display: string;
  /** Raw numeric when available */
  raw?: number;
  /** Whether value comes from live API or placeholder mock */
  source: "live" | "mock";
};

/** Mock placeholders until dedicated analytics endpoints exist. */
const MOCK_ECOSYSTEM = {
  liquidityLocked: 1_200_000,
  holders: 34_000,
  volumeTraded: 8_400_000,
} as const;

function formatStat(n: number, prefix = ""): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${Math.round(n / 1_000).toLocaleString()}K`;
  return `${prefix}${n.toLocaleString()}`;
}

/** Merge live platform stats with structured mock fallbacks. */
export function buildEcosystemStats(live?: PlatformStats | null): EcosystemStatItem[] {
  const tokens = live?.tokenCount ?? 0;
  const verified = live?.verificationCount ?? 0;

  return [
    {
      key: "tokensCreated",
      label: "Tokens Created",
      display: tokens > 0 ? tokens.toLocaleString() : "12,430",
      raw: tokens > 0 ? tokens : 12430,
      source: tokens > 0 ? "live" : "mock",
    },
    {
      key: "liquidityLocked",
      label: "Liquidity Locked",
      display: formatStat(MOCK_ECOSYSTEM.liquidityLocked, "$"),
      raw: MOCK_ECOSYSTEM.liquidityLocked,
      source: "mock",
    },
    {
      key: "holders",
      label: "Total Holders",
      display: formatStat(MOCK_ECOSYSTEM.holders),
      raw: MOCK_ECOSYSTEM.holders,
      source: "mock",
    },
    {
      key: "volumeTraded",
      label: "Volume Traded",
      display: formatStat(MOCK_ECOSYSTEM.volumeTraded, "$"),
      raw: MOCK_ECOSYSTEM.volumeTraded,
      source: "mock",
    },
    {
      key: "verifiedProjects",
      label: "Verified Projects",
      display: verified > 0 ? verified.toLocaleString() : "1,240",
      raw: verified > 0 ? verified : 1240,
      source: verified > 0 ? "live" : "mock",
    },
  ];
}
