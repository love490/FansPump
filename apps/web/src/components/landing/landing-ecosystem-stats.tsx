"use client";

import { useQuery } from "@tanstack/react-query";
import { Droplets, Layers, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPlatformStats, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { buildEcosystemStats } from "@/lib/landing/ecosystem-stats";
import { cn } from "@/lib/utils";

const ICONS = {
  tokensCreated: Layers,
  liquidityLocked: Droplets,
  holders: Users,
  volumeTraded: TrendingUp,
  verifiedProjects: ShieldCheck,
} as const;

export function LandingEcosystemStats() {
  const chainId = getActiveChainId();
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: tokenQueryKeys.stats(chainId),
    queryFn: fetchPlatformStats,
    staleTime: 30_000,
  });

  const items = buildEcosystemStats(isLoading ? null : stats);

  return (
    <section id="ecosystem" className="space-y-4">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">Ecosystem Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform activity across OPNChain — live where available.
        </p>
      </div>

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <span>Live stats unavailable — showing structured placeholders.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((stat) => {
          const Icon = ICONS[stat.key];
          return (
            <div
              key={stat.key}
              className={cn(
                "group rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300",
                "hover:border-primary/30 hover:shadow-[0_0_24px_rgba(30,91,255,0.08)]"
              )}
            >
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold tabular-nums">{isLoading ? "…" : stat.display}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {stat.source === "mock" && !isLoading && (
                <span className="mt-1 inline-block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  Preview data
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
