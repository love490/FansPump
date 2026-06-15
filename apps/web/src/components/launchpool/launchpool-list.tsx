"use client";

import { apiUrl } from "@/lib/api";

import { useCallback, useEffect, useState } from "react";
import { LaunchpoolCard } from "@/components/launchpool/launchpool-card";
import { cn } from "@/lib/utils";
import type { SerializedLaunchpool } from "@/lib/launchpool/serialize";

export type LaunchpoolTab = "ACTIVE" | "ONGOING" | "ENDED";

const TABS: { id: LaunchpoolTab; label: string }[] = [
  { id: "ACTIVE", label: "Active" },
  { id: "ONGOING", label: "Ongoing" },
  { id: "ENDED", label: "Ended" },
];

export function LaunchpoolList({
  initialTab = "ACTIVE",
  compactCards = false,
  showTabs = true,
  limit,
}: {
  initialTab?: LaunchpoolTab;
  compactCards?: boolean;
  showTabs?: boolean;
  limit?: number;
}) {
  const [tab, setTab] = useState<LaunchpoolTab>(initialTab);
  const [pools, setPools] = useState<SerializedLaunchpool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(apiUrl(`/api/launchpool?status=${tab}`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then((data: { pools?: SerializedLaunchpool[] }) => {
        const rows = data.pools ?? [];
        setPools(limit ? rows.slice(0, limit) : rows);
      })
      .catch(() => setError("Could not load launchpools."))
      .finally(() => setLoading(false));
  }, [tab, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {showTabs && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                tab === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading launchpools…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : pools.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {tab.toLowerCase()} launchpools yet.
        </p>
      ) : (
        <div className="space-y-4">
          {pools.map((pool) => (
            <LaunchpoolCard key={pool.id} pool={pool} compact={compactCards} onUpdated={load} />
          ))}
        </div>
      )}
    </div>
  );
}
