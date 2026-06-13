"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket, TrendingUp, Users, Shield } from "lucide-react";
import { TokenPreviewCard } from "@/components/tokens/token-preview-card";
import { tokenCardGridClass, tokenCardSkeletonClass } from "@/components/tokens/token-card-styles";
import { useQuery } from "@tanstack/react-query";
import { fetchDiscoverTokens, fetchPlatformStats, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { cn } from "@/lib/utils";

export function HomeDashboard() {
  const chainId = getActiveChainId();

  const {
    data: stats,
    isError: statsError,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: tokenQueryKeys.stats(chainId),
    queryFn: fetchPlatformStats,
    staleTime: 30_000,
    retry: 2,
  });

  const { data: newTokens = [], isLoading: loadingNew } = useQuery({
    queryKey: tokenQueryKeys.discover("new", chainId),
    queryFn: () => fetchDiscoverTokens("new", 6),
    staleTime: 15_000,
  });

  const statValue = (n: number | undefined) => {
    if (statsLoading) return "…";
    if (statsError) return "—";
    return n ?? 0;
  };

  const statCards = [
    { label: "Total Tokens", value: statValue(stats?.tokenCount), icon: Rocket },
    { label: "Verified Projects", value: statValue(stats?.verificationCount), icon: Shield },
    { label: "Community Votes", value: statValue(stats?.voteCount), icon: TrendingUp },
    { label: "Active Creators", value: statValue(stats?.creatorCount), icon: Users },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform activity and newly created tokens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/create">
              Create Token <Rocket className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/discover?section=trending">Explore Projects</Link>
          </Button>
        </div>
      </header>

      <div className="space-y-2">
        {statsError && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <span>Platform stats unavailable — database may be unreachable.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchStats()}>
              Retry
            </Button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <stat.icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Newly Created</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/discover?section=new">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {loadingNew ? (
          <div className={tokenCardGridClass}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={tokenCardSkeletonClass()} />
            ))}
          </div>
        ) : newTokens.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            No tokens yet — be the first to launch on FansPump.
          </p>
        ) : (
          <div className={cn(tokenCardGridClass, "items-stretch")}>
            {newTokens.map((t, i) => (
              <div key={t.id} className="h-full">
                <TokenPreviewCard token={t} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
