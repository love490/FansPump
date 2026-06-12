"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { shortenAddress } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { SecurityBadges } from "@/components/v2/security-badges";
import type { SecurityBadge } from "@/lib/v2/badges";
import { Trophy } from "lucide-react";

const CATEGORIES = [
  { id: "top-builders", label: "Top Builders", emoji: "🏆" },
  { id: "most-viewed", label: "Most Viewed Creators", emoji: "👀" },
  { id: "most-liquidity", label: "Most Liquidity Added", emoji: "💧" },
  { id: "fastest-growing", label: "Fastest Growing", emoji: "🚀" },
  { id: "most-active", label: "Most Active", emoji: "🔥" },
  { id: "most-trusted", label: "Most Trusted", emoji: "⭐" },
] as const;

type LeaderboardEntry = {
  rank: number;
  walletAddress: string;
  tokensCreated: number;
  totalViews: number;
  totalLiquidity: number;
  reputationScore: number;
  avgTrustScore: number;
  status: string;
  badges: SecurityBadge[];
};

export default function LeaderboardPage() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("top-builders");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?category=${category}&limit=25`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Trophy className="h-7 w-7 text-primary" /> Creator Leaderboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Top builders and trusted creators on FansPump — updated automatically.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
              category === c.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted hover:bg-muted/80"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading leaderboard...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground">No creators ranked yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.walletAddress}>
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <span className="w-8 text-lg font-bold tabular-nums text-muted-foreground">
                  #{entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/creator/${entry.walletAddress}`}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {shortenAddress(entry.walletAddress, 6)}
                  </Link>
                  <p className="text-xs capitalize text-muted-foreground">{entry.status.toLowerCase()}</p>
                  <SecurityBadges badges={entry.badges} className="mt-1" max={4} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">Tokens</p>
                    <p className="font-semibold">{entry.tokensCreated}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Views</p>
                    <p className="font-semibold">{entry.totalViews}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reputation</p>
                    <p className="font-semibold">{entry.reputationScore}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Trust</p>
                    <p className="font-semibold">{Math.round(entry.avgTrustScore)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
