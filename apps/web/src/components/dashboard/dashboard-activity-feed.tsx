"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_KIND_LABELS,
  sortActivities,
  type UserActivity,
} from "@/lib/dashboard/activities";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { liquidityUrl } from "@/lib/navigation/liquidity-routes";
import { cn } from "@/lib/utils";
import { Activity, Layers, Droplets } from "lucide-react";

type DashboardApiResponse = {
  stats?: {
    activeStakes: number;
    liquidityLocks: number;
    questsCompleted: number;
  };
  stakingPositions?: {
    id: string;
    stakingType: "OPN" | "LP";
    amount: string;
    tier: string | null;
    stakedAt: string;
  }[];
  activities?: UserActivity[];
};

function platformBadgeClass(platform: UserActivity["platform"]) {
  return platform === "FansPump"
    ? "border-primary/30 bg-primary/10 text-primary"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

function formatStakeAmount(wei: string) {
  try {
    return formatUnits(BigInt(wei), 18);
  } catch {
    return "0";
  }
}

export function DashboardActivityFeed() {
  const { address, isConnected } = useAccount();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: basePoolLoading } = useBasePoolLpPositions(address);
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(apiUrl(`/api/user/dashboard?wallet=${address.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [address]);

  const onChainLiquidityActivities = useMemo((): UserActivity[] => {
    const items: UserActivity[] = [];
    const now = new Date().toISOString();

    for (const pos of lpPositions) {
      if (pos.pending || pos.lpBalance <= 0n) continue;
      items.push({
        id: `lp-${pos.lpToken}-${pos.pairId}`,
        kind: "liquidity",
        title: `Liquidity · ${pos.tokenSymbol} / ${pos.pairLabel}`,
        subtitle: "Live wallet balance on OPNChain",
        amount: `${formatUnits(pos.lpBalance, pos.lpDecimals)} LP`,
        platform: "OPN Network",
        occurredAt: now,
        href: liquidityUrl({ tab: "remove", token: pos.tokenAddress, pair: pos.pairId }),
      });
    }

    for (const pool of basePools) {
      items.push({
        id: `base-lp-${pool.poolId}`,
        kind: "liquidity",
        title: `Liquidity · ${pool.pairLabel}`,
        subtitle: "Base pool LP on OPNChain",
        amount: `${formatUnits(pool.lpBalance, pool.lpDecimals)} LP`,
        platform: "OPN Network",
        occurredAt: now,
        href: liquidityUrl({ tab: "remove" }),
      });
    }

    return items;
  }, [lpPositions, basePools]);

  const allActivities = useMemo(() => {
    const merged = sortActivities([...(data?.activities ?? []), ...onChainLiquidityActivities]);
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data?.activities, onChainLiquidityActivities]);

  const fansPumpCount = allActivities.filter((a) => a.platform === "FansPump").length;
  const opnCount = allActivities.filter((a) => a.platform === "OPN Network").length;
  const isLoading = loading || lpLoading || basePoolLoading;

  if (!isConnected || !address) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          OPN Network activity
        </CardTitle>
        <CardDescription>
          Track stakes, liquidity, locks, tokens, and quests — labeled by FansPump or OPN Network.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryPill
            icon={Layers}
            label="FansPump stakes"
            value={String(data?.stats?.activeStakes ?? 0)}
            detail="Recorded in FansPump staking"
          />
          <SummaryPill
            icon={Droplets}
            label="OPN liquidity"
            value={String(onChainLiquidityActivities.length)}
            detail="Live on-chain LP positions"
          />
          <SummaryPill
            icon={Activity}
            label="Total tracked"
            value={String(allActivities.length)}
            detail={`${fansPumpCount} FansPump · ${opnCount} OPN Network`}
          />
        </div>

        {data?.stakingPositions && data.stakingPositions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Active stakes (FansPump)</p>
            <div className="space-y-2">
              {data.stakingPositions.map((stake) => (
                <div
                  key={stake.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {stake.stakingType === "OPN" ? "OPN stake" : "LP stake"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatStakeAmount(stake.amount)}{" "}
                      {stake.stakingType === "OPN" ? "OPN" : "LP"}
                      {stake.tier ? ` · ${stake.tier}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={platformBadgeClass("FansPump")}>
                    FansPump
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Activity timeline</p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your OPN network activity…</p>
          ) : allActivities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No activity yet. Stake on FansPump, add liquidity on OPNChain, or join a quest to see
              items here.
            </div>
          ) : (
            <div className="space-y-2">
              {allActivities.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/staking">Staking</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/liquidity">Liquidity</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/earn">Quests</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: UserActivity }) {
  const content = (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {ACTIVITY_KIND_LABELS[item.kind]}
          </Badge>
          <p className="font-medium">{item.title}</p>
        </div>
        {item.subtitle && <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>}
        {item.amount && <p className="mt-1 text-sm font-medium">{item.amount}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(item.occurredAt).toLocaleString()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant="outline" className={cn("shrink-0", platformBadgeClass(item.platform))}>
          {item.platform}
        </Badge>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
