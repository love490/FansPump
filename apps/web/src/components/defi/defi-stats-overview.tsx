"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DefiStatItem = {
  label: string;
  value: string;
  hint?: string;
  /** Secondary line shown under value, e.g. USD equivalent. */
  subValue?: string;
};

type DefiStatsOverviewProps = {
  platformTitle?: string;
  platformDescription?: string;
  personalTitle?: string;
  personalDescription?: string;
  platformStats: DefiStatItem[];
  personalStats: DefiStatItem[];
  loading?: boolean;
  platformLoading?: boolean;
  personalLoading?: boolean;
  isConnected?: boolean;
  connectMessage?: string;
  className?: string;
  showPersonal?: boolean;
};

export function StatGrid({
  stats,
  loading,
}: {
  stats: DefiStatItem[];
  loading?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="min-w-0 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5"
        >
          <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
          <p className="mt-0.5 break-words text-sm font-semibold tabular-nums leading-snug sm:text-base">
            {loading ? "…" : stat.value}
          </p>
          {stat.subValue && !loading && (
            <p className="mt-0.5 break-words text-xs font-medium tabular-nums text-muted-foreground sm:text-sm">
              {stat.subValue}
            </p>
          )}
          {stat.hint && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function DefiStatsOverview({
  platformTitle = "Platform total",
  platformDescription = "Combined activity across all FansPump users on OPN Network.",
  personalTitle = "Your activity",
  personalDescription = "Your wallet on this page.",
  platformStats,
  personalStats,
  loading,
  platformLoading,
  personalLoading,
  isConnected = true,
  connectMessage = "Connect your wallet to see your personal totals.",
  className,
  showPersonal = true,
}: DefiStatsOverviewProps) {
  return (
    <div className={cn("grid gap-4", showPersonal ? "md:grid-cols-2" : "grid-cols-1", className)}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{platformTitle}</CardTitle>
          <CardDescription>{platformDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <StatGrid stats={platformStats} loading={loading || platformLoading} />
        </CardContent>
      </Card>

      {showPersonal && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{personalTitle}</CardTitle>
          <CardDescription>{personalDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {connectMessage}
            </p>
          ) : (
            <StatGrid stats={personalStats} loading={loading || personalLoading} />
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
