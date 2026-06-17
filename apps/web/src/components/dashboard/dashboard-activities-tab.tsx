"use client";

import { apiUrl, readApiJson } from "@/lib/api";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { Badge } from "@/components/ui/badge";
import {
  ACTIVITY_KIND_LABELS,
  sortActivities,
  type UserActivity,
} from "@/lib/dashboard/activities";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { loadStoredLiquidityPositions } from "@/lib/liquidity/my-liquidity-storage";
import { cn } from "@/lib/utils";

function platformBadgeClass(platform: UserActivity["platform"]) {
  return platform === "FansPump"
    ? "border-primary/30 bg-primary/10 text-primary"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

export function DashboardActivitiesTab() {
  const { walletAddress } = useActiveWallet();
  const { positions: lpPositions, loading: lpLoading } = useMyLiquidityPositions(walletAddress);
  const { positions: basePools, loading: basePoolLoading } = useBasePoolLpPositions(walletAddress);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setActivities([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetch(apiUrl(`/api/user/dashboard?wallet=${walletAddress.toLowerCase()}`))
      .then(async (r) => {
        const { ok, data, error } = await readApiJson<{ activities?: UserActivity[]; error?: string }>(r);
        if (!ok) throw new Error(error ?? data.error ?? `Failed to load activity (${r.status})`);
        return data;
      })
      .then((d) => setActivities(d?.activities ?? []))
      .catch((e) => {
        setActivities([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load activity");
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const storedLiquidityActivities = useMemo((): UserActivity[] => {
    if (!walletAddress) return [];
    return loadStoredLiquidityPositions(walletAddress).map((entry) => ({
      id: `liquidity-add-${entry.tokenAddress}-${entry.pairId}`,
      kind: "liquidity" as const,
      title: `Liquidity added · ${entry.tokenSymbol} / ${entry.pairSymbol}`,
      subtitle: entry.txHash ? `Tx ${entry.txHash.slice(0, 10)}…` : "Recorded on this device",
      platform: "FansPump" as const,
      occurredAt: entry.addedAt,
      href: `/liquidity/${entry.tokenAddress}`,
    }));
  }, [walletAddress]);

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
    const merged = sortActivities([
      ...activities,
      ...storedLiquidityActivities,
      ...onChainLiquidityActivities,
    ]);
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [activities, storedLiquidityActivities, onChainLiquidityActivities]);

  const isLoading = loading || lpLoading || basePoolLoading;

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading activities…</p>;
  }

  if (loadError && allActivities.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
      </div>
    );
  }

  if (allActivities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No activity yet. Trades, stakes, liquidity, token creation, and quests will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {loadError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Some activity history could not be loaded from the server. Showing wallet data where available.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Tokens created, liquidity locks, burns, stakes, and quests on FansPump and OPN Network.
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
