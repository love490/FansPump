"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatLaunchpoolPrize,
  launchpoolHeadline,
  type SerializedLaunchpool,
} from "@/lib/launchpool/serialize";

const STATUS_LABELS = {
  ACTIVE: "Active",
  ONGOING: "Ongoing",
  ENDED: "Ended",
} as const;

function ProjectAvatar({ title }: { title: string }) {
  const letter = title.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
      {letter}
    </div>
  );
}

export function LaunchpoolCard({ pool }: { pool: SerializedLaunchpool }) {
  return (
    <Link href={`/launchpool/${pool.id}`} className="block">
      <Card className="border-border/80 transition-colors hover:border-primary/40 hover:bg-muted/10">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ProjectAvatar title={pool.title} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{pool.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {launchpoolHeadline(pool)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={pool.status === "ENDED" ? "secondary" : "default"}>
                {STATUS_LABELS[pool.status]}
              </Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Prize Pool ({pool.rewardTokenSymbol})
              </p>
              <p className="text-xl font-semibold">{formatLaunchpoolPrize(pool)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                My Rewards ({pool.rewardTokenSymbol})
              </p>
              <p className="text-xl font-semibold">0.00</p>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            {pool.stakeAssets.map((asset) => (
              <div
                key={`${asset.assetSymbol}-${asset.assetAddress ?? "native"}`}
                className="flex items-center gap-2 text-sm"
              >
                <ProjectAvatar title={asset.assetSymbol} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{asset.assetSymbol} Pool</p>
                  <p className="text-xs text-muted-foreground">
                    Stake {asset.assetSymbol} to earn {pool.rewardTokenSymbol}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-primary">Tap to view pools and stake</p>
        </CardContent>
      </Card>
    </Link>
  );
}
