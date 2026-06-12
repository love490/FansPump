"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustScoreBreakdownItem } from "@/lib/v2/trust-score";
import { SecurityBadges } from "@/components/v2/security-badges";
import type { SecurityBadge } from "@/lib/v2/badges";

type TrustApiResponse = {
  enabled: boolean;
  trust?: {
    score: number;
    riskLevel: string;
    riskLabel: string;
    breakdown: TrustScoreBreakdownItem[];
    badges: SecurityBadge[];
  };
};

const RISK_STYLES: Record<string, string> = {
  excellent: "text-green-600 dark:text-green-400",
  good: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

function BreakdownRow({ item }: { item: TrustScoreBreakdownItem }) {
  const icon =
    item.status === "pass" ? "✓" : item.status === "warn" ? "⚠" : item.status === "fail" ? "✗" : "·";
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.detail}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className="mr-1">{icon}</span>
        <span className="tabular-nums text-muted-foreground">
          {item.points}/{item.maxPoints}
        </span>
      </div>
    </div>
  );
}

export function TokenTrustScorePanel({ tokenAddress }: { tokenAddress: string }) {
  const [data, setData] = useState<TrustApiResponse | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/trust/${tokenAddress}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ enabled: false }));
  }, [tokenAddress]);

  if (!data?.enabled || !data.trust) return null;

  const { score, riskLevel, riskLabel, breakdown, badges } = data.trust;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" /> Trust Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Trust Score</p>
            <p className="text-4xl font-bold tabular-nums">
              {score}
              <span className="text-lg font-normal text-muted-foreground">/100</span>
            </p>
            <p className={cn("mt-1 text-sm font-semibold", RISK_STYLES[riskLevel] ?? "")}>
              {riskLabel}
            </p>
          </div>
          <SecurityBadges badges={badges} size="md" max={6} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {breakdown.slice(0, 6).map((item) => (
            <BreakdownRow key={item.factor} item={item} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Why this score?
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
            {breakdown.map((item) => (
              <BreakdownRow key={`full-${item.factor}`} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type HealthApiResponse = TrustApiResponse & {
  health?: {
    holders: number;
    liquidity: number;
    volume24h: number;
    ownershipRenounced: boolean;
    liquidityLocked: boolean;
    liquidityBurned: boolean;
    contractVerified: boolean;
  };
};

function HealthIndicator({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", good === true && "text-green-600 dark:text-green-400", good === false && "text-amber-600")}>
        {value}
      </p>
    </div>
  );
}

export function TokenHealthPanel({ tokenAddress }: { tokenAddress: string }) {
  const [data, setData] = useState<HealthApiResponse | null>(null);

  useEffect(() => {
    fetch(`/api/trust/${tokenAddress}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [tokenAddress]);

  if (!data?.enabled || !data.health || !data.trust) return null;

  const h = data.health;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" /> Token Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <HealthIndicator label="Trust Score" value={`${data.trust.score}/100`} good={data.trust.score >= 75} />
          <HealthIndicator label="Holders" value={String(h.holders)} />
          <HealthIndicator label="Liquidity" value={h.liquidity > 0 ? h.liquidity.toFixed(2) : "—"} good={h.liquidity > 0} />
          <HealthIndicator label="Volume (24h)" value={h.volume24h > 0 ? h.volume24h.toFixed(2) : "—"} />
          <HealthIndicator label="Ownership" value={h.ownershipRenounced ? "Renounced" : "Active"} good={h.ownershipRenounced} />
          <HealthIndicator
            label="Liquidity Status"
            value={h.liquidityBurned ? "Burned" : h.liquidityLocked ? "Locked" : "Unlocked"}
            good={h.liquidityLocked || h.liquidityBurned}
          />
          <HealthIndicator label="Contract" value={h.contractVerified ? "Verified" : "Unverified"} good={h.contractVerified} />
        </div>
      </CardContent>
    </Card>
  );
}
