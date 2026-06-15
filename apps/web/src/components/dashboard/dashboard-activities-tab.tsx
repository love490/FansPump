"use client";

import { apiUrl } from "@/lib/api";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Badge } from "@/components/ui/badge";
import {
  ACTIVITY_KIND_LABELS,
  sortActivities,
  type UserActivity,
} from "@/lib/dashboard/activities";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { cn } from "@/lib/utils";

function platformBadgeClass(platform: UserActivity["platform"]) {
  return platform === "FansPump"
    ? "border-primary/30 bg-primary/10 text-primary"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

export function DashboardActivitiesTab() {
  const { address } = useAccount();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: basePoolLoading } = useBasePoolLpPositions(address);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setActivities([]);
      return;
    }
    setLoading(true);
    fetch(apiUrl(`/api/user/dashboard?wallet=${address.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setActivities(d?.activities ?? []))
      .catch(() => setActivities([]))
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
        subtitle: "Live wallet balance",
        amount: `${formatUnits(pos.lpBalance, pos.lpDecimals)} LP`,
        platform: "OPN Network",
        occurredAt: now,
        href: `/liquidity/${pos.tokenAddress}`,
      });
    }

    for (const pool of basePools) {
      if (pool.lpBalance <= 0n) continue;
      items.push({
        id: `base-lp-${pool.poolId}`,
        kind: "liquidity",
        title: `Liquidity · ${pool.pairLabel}`,
        subtitle: "Base pool LP",
        amount: `${formatUnits(pool.lpBalance, pool.lpDecimals)} LP`,
        platform: "OPN Network",
        occurredAt: now,
        href: "/liquidity",
      });
    }

    return items;
  }, [lpPositions, basePools]);

  const allActivities = useMemo(() => {
    const merged = sortActivities([...activities, ...onChainLiquidityActivities]);
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [activities, onChainLiquidityActivities]);

  const isLoading = loading || lpLoading || basePoolLoading;

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading activities…</p>;
  }

  if (allActivities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No activity yet. Trades, stakes, liquidity, and quests will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Transactions, trades, stakes, and quests on FansPump and OPN Network.
      </p>
      {allActivities.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
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
      <Badge variant="outline" className={cn("shrink-0", platformBadgeClass(item.platform))}>
        {item.platform}
      </Badge>
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
