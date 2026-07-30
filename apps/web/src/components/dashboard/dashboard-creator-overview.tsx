"use client";

import Link from "next/link";
import { ArrowUpRight, Droplets, Rocket, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreatorOverview } from "@/hooks/dashboard/useCreatorOverview";
import { cn } from "@/lib/utils";

function StatCell({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function trustTone(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

type DashboardCreatorOverviewProps = {
  walletAddress: string | undefined;
  /** Tokens created, from the wallet dashboard summary. */
  tokensCreated: number;
  launchpoolsJoined: number;
};

export function DashboardCreatorOverview({
  walletAddress,
  tokensCreated,
  launchpoolsJoined,
}: DashboardCreatorOverviewProps) {
  const isCreator = tokensCreated > 0;
  const { data, loading } = useCreatorOverview(walletAddress, isCreator);

  if (!isCreator || !walletAddress) return null;

  const trustScore = data?.avgTrustScore;
  const liquidityAdded = data?.liquidityAdded;
  const followers = data?.followers;

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-background">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-violet-500" />
          Creator overview
        </CardTitle>
        <Link
          href={`/creator/${walletAddress.toLowerCase()}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Public profile
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCell
          icon={<Rocket className="h-3.5 w-3.5" />}
          label="Projects"
          value={String(tokensCreated)}
          hint={tokensCreated === 1 ? "token created" : "tokens created"}
        />
        <StatCell
          icon={<Droplets className="h-3.5 w-3.5" />}
          label="Liquidity"
          value={
            loading && liquidityAdded === undefined
              ? "…"
              : liquidityAdded === undefined
                ? "—"
                : liquidityAdded.toLocaleString(undefined, { maximumFractionDigits: 2 })
          }
          hint="pool strength added"
        />
        <StatCell
          icon={<Rocket className="h-3.5 w-3.5" />}
          label="LaunchPools"
          value={String(launchpoolsJoined)}
          hint="joined"
        />
        <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="truncate">Trust score</span>
          </div>
          <p
            className={cn(
              "mt-1 text-lg font-semibold tabular-nums",
              trustScore !== undefined && trustTone(trustScore)
            )}
          >
            {loading && trustScore === undefined ? "…" : trustScore === undefined ? "—" : trustScore}
          </p>
          <p className="text-xs text-muted-foreground">average across your tokens</p>
        </div>
      </CardContent>
      {typeof followers === "number" && followers > 0 && (
        <CardContent className="pt-0">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {followers} follower{followers === 1 ? "" : "s"}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
