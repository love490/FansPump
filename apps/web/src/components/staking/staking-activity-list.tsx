"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatActivityAmount } from "@/lib/dashboard/activities";

export type StakingActivityRow = {
  id: string;
  label: string;
  amount: string;
  detail?: string;
  href: string;
  badge: string;
};

export function StakingActivityList({
  rows,
  emptyMessage = "No active staking positions.",
}: {
  rows: StakingActivityRow[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={row.href}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/30"
        >
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="text-sm text-muted-foreground">
              {row.amount}
              {row.detail ? ` · ${row.detail}` : ""}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {row.badge}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

export function launchpoolStakeToActivityRow(stake: {
  id: string;
  launchpoolTitle: string;
  assetSymbol: string;
  amount: string;
  stakedAt: string;
}): StakingActivityRow {
  return {
    id: `launchpool-${stake.id}`,
    label: `Launchpool · ${stake.launchpoolTitle}`,
    amount: formatActivityAmount(stake.amount, 18, stake.assetSymbol),
    detail: `Since ${new Date(stake.stakedAt).toLocaleDateString()}`,
    href: "/staking?tab=launchpool",
    badge: "Launchpool",
  };
}
