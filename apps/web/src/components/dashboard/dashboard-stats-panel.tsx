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
  bountiesCreated: number;
  bountiesJoined: number;
  bountiesCompleted: number;
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
      label: "Liquidity locked",
      value: loading ? "…" : String(stats?.liquidityLocks ?? 0),
      detail: stats?.liquidityLockedAmount
        ? `${formatLockAmount(stats.liquidityLockedAmount)} LP locked`
        : "No LP locks yet",
      icon: Lock,
      href: "/my-liquidity",
    },
    {
      label: "Liquidity added",
      value: lpLoading ? "…" : String(activeLpCount),
      detail: activeLpCount === 1 ? "1 active position" : `${activeLpCount} active positions`,
      icon: Droplets,
      href: "/my-liquidity",
    },
    {
      label: "Bounties completed",
      value: loading ? "…" : String(stats?.bountiesCompleted ?? 0),
      detail: stats?.bountiesJoined
        ? `${stats.bountiesJoined} joined total`
        : "Join bounties on Earn",
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
          : "Complete bounties to earn",
      icon: Gift,
      href: "/earn",
    },
    {
      label: "Active stakes",
      value: loading ? "…" : String(stats?.activeStakes ?? 0),
      detail: "OPN & LP staking positions",
      icon: Layers,
      href: "/staking",
    },
    {
      label: "Tokens created",
      value: loading ? "…" : String(stats?.tokensCreated ?? 0),
      detail: stats?.bountiesCreated
        ? `${stats.bountiesCreated} bounties created`
        : "Launch on FansPump",
      icon: CircleDollarSign,
      href: "/my-tokens",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your activity</CardTitle>
        <CardDescription>
          Liquidity, locks, bounties, and rewards across your FansPump account.
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

        {stats?.rewardsEarned && stats.rewardsEarned.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium">Completed bounty rewards</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {stats.rewardsEarned.map((reward, i) => (
                <li key={`${reward}-${i}`}>• {reward}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/my-liquidity">Manage liquidity</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/earn">View bounties</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
