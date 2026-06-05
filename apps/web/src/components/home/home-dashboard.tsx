"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket, TrendingUp, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { TokenCard } from "@/components/tokens/token-card";
import { useQuery } from "@tanstack/react-query";
import { fetchDiscoverTokens, fetchPlatformStats, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";

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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative min-h-[240px] overflow-hidden rounded-2xl shadow-lg sm:min-h-[260px] md:min-h-[280px]"
      >
        <Image
          src="/images/hero-banner.png"
          alt=""
          fill
          priority
          className="object-cover object-[92%_center] md:object-[68%_center]"
          sizes="(max-width: 1024px) 100vw, 1100px"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628] from-45% via-[#0a1628]/80 via-65% to-transparent md:from-[#0a1628]/92 md:via-[#0a1628]/55 md:from-0% md:via-50%" />
        <div className="relative z-10 flex min-h-[240px] flex-col justify-center p-5 sm:min-h-[260px] sm:p-8 md:min-h-[280px] md:p-12">
          <div className="max-w-[12rem] min-[400px]:max-w-[14rem] sm:max-w-md md:max-w-xl">
            <h1 className="text-xl font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-2xl md:text-4xl md:font-bold md:drop-shadow-none">
              Create Your Token.
              <br />
              Grow Your Community.
            </h1>
            <p className="mt-2 text-xs font-semibold leading-snug text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] sm:mt-3 sm:text-sm sm:font-medium sm:text-white/90 md:mt-3 md:text-base md:font-normal md:text-white/80 md:drop-shadow-none">
              FansPump makes it easy to create tokens, build your project and grow your community.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
              <Button asChild size="default" className="bg-primary hover:bg-primary/90 sm:h-11 sm:px-8">
                <Link href="/create">
                  Create Token <Rocket className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="default"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:h-11 sm:px-8"
              >
                <Link href="/discover?section=new">Explore Tokens</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : newTokens.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No tokens yet — be the first to launch on FansPump.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {newTokens.map((t, i) => (
              <TokenCard key={t.id} token={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
