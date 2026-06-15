"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CircleDollarSign,
  Droplets,
  Gift,
  Layers,
  Lock,
  Trophy,
} from "lucide-react";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";

type DashboardStats = {
  tokensCreated: number;
  liquidityLocks: number;
  liquidityLockedAmount: string;
  questsCreated: number;
  questsJoined: number;
  questsCompleted: number;
  rewardsEarned: string[];
  rewardsEarnedOpn: number;
  activeStakes: number;
};

function formatLockAmount(wei: string) {
  try {
    const n = BigInt(wei);
    if (n === 0n) return "0";
    return formatUnits(n, 18);
  } catch {
    return "0";
  }
}

export function DashboardStatsPanel() {
  const { address, isConnected } = useAccount();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(address);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  const activeLpCount = lpPositions.filter((p) => p.lpBalance > 0n && !p.pending).length;

  useEffect(() => {
    if (!address) {
      setStats(null);
      return;
    }
    setLoading(true);
    fetch(`/api/user/dashboard?wallet=${address.toLowerCase()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStats(d?.stats ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [address]);

  if (!isConnected || !address) return null;

  const statCards = [
    {
      label: "FansPump stakes",
      value: loading ? "…" : String(stats?.activeStakes ?? 0),
      detail: "Staked via FansPump",
      icon: Layers,
      href: "/staking",
    },
    {
      label: "OPN liquidity",
      value: lpLoading ? "…" : String(activeLpCount),
      detail: "Live LP on OPNChain",
      icon: Droplets,
      href: "/liquidity",
    },
    {
      label: "Liquidity locked",
      value: loading ? "…" : String(stats?.liquidityLocks ?? 0),
      detail: stats?.liquidityLockedAmount
        ? `${formatLockAmount(stats.liquidityLockedAmount)} LP locked`
        : "No LP locks yet",
      icon: Lock,
      href: "/liquidity",
    },
    {
      label: "Quests completed",
      value: loading ? "…" : String(stats?.questsCompleted ?? 0),
      detail: stats?.questsJoined
        ? `${stats.questsJoined} joined total`
        : "Join quests on Earn",
      icon: Trophy,
      href: "/earn",
    },
    {
      label: "Rewards earned",
      value: loading
        ? "…"
        : stats?.rewardsEarnedOpn && stats.rewardsEarnedOpn > 0
          ? `${stats.rewardsEarnedOpn} OPN`
          : String(stats?.rewardsEarned?.length ?? 0),
      detail:
        stats?.rewardsEarned && stats.rewardsEarned.length > 0
          ? stats.rewardsEarned.slice(0, 2).join(" · ")
          : "Complete quests to earn",
      icon: Gift,
      href: "/earn",
    },
    {
      label: "Tokens created",
      value: loading ? "…" : String(stats?.tokensCreated ?? 0),
      detail: stats?.questsCreated
        ? `${stats.questsCreated} quests created`
        : "Launch on FansPump",
      icon: CircleDollarSign,
      href: "/dashboard",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Overview</CardTitle>
        <CardDescription>
          Summary across FansPump and OPN Network — see full timeline below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
                </div>
                <stat.icon className="h-5 w-5 shrink-0 text-primary" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/liquidity">Manage liquidity</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/earn">View quests</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
