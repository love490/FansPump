"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/utils";
import { SecurityBadges } from "@/components/v2/security-badges";
import type { SecurityBadge } from "@/lib/v2/badges";

/** UI-ready builder card shape — matches future leaderboard API. */
export type BuilderPreview = {
  walletAddress: string;
  displayName?: string;
  tokensCreated: number;
  liquidityAdded: number;
  totalViews?: number;
  reputationScore: number;
  status: string;
  badges: SecurityBadge[];
};

const FALLBACK_BUILDERS: BuilderPreview[] = [
  {
    walletAddress: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
    tokensCreated: 8,
    liquidityAdded: 142000,
    totalViews: 12400,
    reputationScore: 820,
    status: "TRUSTED",
    badges: [{ id: "top_creator", emoji: "🏆", label: "Top Creator" }],
  },
  {
    walletAddress: "0x8ba1f109551bd432803012645ac136c772c3e3e8",
    tokensCreated: 5,
    liquidityAdded: 98000,
    totalViews: 8900,
    reputationScore: 640,
    status: "VERIFIED",
    badges: [{ id: "early_builder", emoji: "⭐", label: "Early Builder" }],
  },
  {
    walletAddress: "0x1234567890123456789012345678901234567890",
    tokensCreated: 4,
    liquidityAdded: 76000,
    totalViews: 6200,
    reputationScore: 510,
    status: "VERIFIED",
    badges: [],
  },
  {
    walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    tokensCreated: 3,
    liquidityAdded: 54000,
    totalViews: 4100,
    reputationScore: 380,
    status: "ANONYMOUS",
    badges: [{ id: "early_builder", emoji: "⭐", label: "Early Builder" }],
  },
];

function formatLiquidity(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function showCreatorStatus(status: string): boolean {
  return status === "VERIFIED" || status === "TRUSTED";
}

export function LandingTopBuilders() {
  const [builders, setBuilders] = useState<BuilderPreview[]>(FALLBACK_BUILDERS);

  useEffect(() => {
    fetch("/api/leaderboard?category=top-builders&limit=4")
      .then((r) => r.json())
      .then((d) => {
        if (!d.enabled || !Array.isArray(d.entries) || d.entries.length === 0) return;
        setBuilders(
          d.entries.map(
            (e: {
              walletAddress: string;
              tokensCreated: number;
              totalLiquidity: number;
              totalViews: number;
              reputationScore: number;
              status: string;
              badges: SecurityBadge[];
            }) => ({
              walletAddress: e.walletAddress,
              tokensCreated: e.tokensCreated,
              liquidityAdded: e.totalLiquidity,
              totalViews: e.totalViews,
              reputationScore: e.reputationScore,
              status: e.status,
              badges: e.badges ?? [],
            })
          )
        );
      })
      .catch(() => {});
  }, []);

  return (
    <section id="builders" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Trophy className="h-6 w-6 text-primary" />
            Top Builders This Week
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Creators driving growth across the IOPn ecosystem.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/leaderboard">
            Explore tokens
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {builders.map((builder, i) => (
          <Link
            key={builder.walletAddress}
            href={`/creator/${builder.walletAddress}`}
            className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_24px_rgba(30,91,255,0.1)]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
              {showCreatorStatus(builder.status) && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  {builder.status.toLowerCase()}
                </Badge>
              )}
            </div>
            <p className="mt-2 font-semibold group-hover:text-primary">
              {builder.displayName ?? shortenAddress(builder.walletAddress, 4)}
            </p>
            <SecurityBadges badges={builder.badges} className="mt-2" max={2} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Liquidity</p>
                <p className="font-semibold tabular-nums">{formatLiquidity(builder.liquidityAdded)}</p>
              </div>
              {builder.totalViews != null && (
                <div>
                  <p className="text-muted-foreground">Views</p>
                  <p className="font-semibold tabular-nums">{builder.totalViews.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Reputation</p>
                <p className="font-semibold tabular-nums">{builder.reputationScore}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
