"use client";

import { useQuery } from "@tanstack/react-query";
import { Rocket, Shield, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPlatformStats, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";

export function LandingStats() {
  const chainId = getActiveChainId();
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: tokenQueryKeys.stats(chainId),
    queryFn: fetchPlatformStats,
    staleTime: 30_000,
  });

  const value = (n: number | undefined) => {
    if (isLoading) return "…";
    if (isError) return "—";
    return n ?? 0;
  };

  const cards = [
    { label: "Total Tokens", value: value(stats?.tokenCount), icon: Rocket },
    { label: "Verified Creators", value: value(stats?.verificationCount), icon: Shield },
    { label: "Community Votes", value: value(stats?.voteCount), icon: TrendingUp },
    { label: "Active Creators", value: value(stats?.creatorCount), icon: Users },
  ];

  return (
    <section className="space-y-4">
      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <span>Stats unavailable — database may be unreachable.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <stat.icon className="mb-2 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
