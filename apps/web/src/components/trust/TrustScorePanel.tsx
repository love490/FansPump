"use client";

import { useState } from "react";
import { Activity, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTrustScore } from "@/hooks/useTrustScore";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { TrustScoreBar } from "@/components/trust/TrustScoreBar";
import { TrustBreakdownModal } from "@/components/trust/TrustBreakdownModal";
import { SecurityBadges } from "@/components/v2/security-badges";
import { TokenFeatureBadges } from "@/components/token/token-feature-badges";

const COMPONENT_BARS = [
  { key: "contractSafety" as const, label: "Contract Safety", weight: 0.35, colorClass: "bg-violet-500" },
  { key: "liquiditySafety" as const, label: "Liquidity Safety", weight: 0.25, colorClass: "bg-blue-500" },
  { key: "marketIntegrity" as const, label: "Market Integrity", weight: 0.25, colorClass: "bg-cyan-500" },
  { key: "creatorReputation" as const, label: "Creator Reputation", weight: 0.15, colorClass: "bg-amber-500" },
];

const RISK_STYLES: Record<string, string> = {
  excellent: "text-green-600 dark:text-green-400",
  good: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

function formatCompactNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    // Fallback if Intl compact is not available for some reason.
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(decimals);
  }
}

function HealthIndicator({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          good === true && "text-green-600 dark:text-green-400",
          good === false && "text-amber-600"
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function TrustScorePanel({ tokenAddress }: { tokenAddress: string }) {
  const { trustScore, isLoading } = useTrustScore(tokenAddress);
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="h-8 w-32 animate-pulse rounded-full bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!trustScore) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" /> Trust Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <TrustBadge
                tier={trustScore.tier}
                score={trustScore.score}
                size="lg"
                onClick={() => setModalOpen(true)}
              />
              <p className={cn("mt-2 text-sm font-semibold", RISK_STYLES[trustScore.riskLevel] ?? "")}>
                {trustScore.riskLabel}
              </p>
            </div>
            <SecurityBadges badges={trustScore.badges} size="md" max={6} />
          </div>

          <div className="space-y-3">
            {COMPONENT_BARS.map((bar) => (
              <TrustScoreBar
                key={bar.key}
                label={bar.label}
                score={trustScore[bar.key]}
                weight={bar.weight}
                colorClass={bar.colorClass}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Why this score?
          </button>
        </CardContent>
      </Card>

      <TrustBreakdownModal data={trustScore} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function TokenHealthPanel({
  tokenAddress,
  featureFlags,
  buyTaxBps,
  sellTaxBps,
}: {
  tokenAddress: string;
  featureFlags?: number;
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
}) {
  const { trustScore, health, isLoading } = useTrustScore(tokenAddress);

  if (isLoading || !trustScore || !health) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" /> Token Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <HealthIndicator
            label="Trust Score"
            value={`${trustScore.score}/100`}
            good={trustScore.score >= 70}
          />
          <HealthIndicator label="Holders" value={String(health.holders)} />
          <HealthIndicator
            label="Liquidity"
            value={formatCompactNumber(health.liquidity, 2)}
            good={health.liquidity > 0}
          />
          <HealthIndicator
            label="Volume (24h)"
            value={formatCompactNumber(health.volume24h, 2)}
          />
          <HealthIndicator
            label="Ownership"
            value={health.ownershipRenounced ? "Renounced" : "Active"}
            good={health.ownershipRenounced}
          />
          <HealthIndicator
            label="Liquidity Status"
            value={health.liquidityBurned ? "Burned" : health.liquidityLocked ? "Locked" : "Unlocked"}
            good={health.liquidityLocked || health.liquidityBurned}
          />
          <HealthIndicator
            label="Contract"
            value={health.contractVerified ? "Verified" : "Unverified"}
            good={health.contractVerified}
          />
        </div>

        {featureFlags != null && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Features &amp; protections
            </p>
            <TokenFeatureBadges
              tokenAddress={tokenAddress}
              featureFlags={featureFlags}
              buyTaxBps={buyTaxBps}
              sellTaxBps={sellTaxBps}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** @deprecated Use TrustScorePanel */
export const TokenTrustScorePanel = TrustScorePanel;
