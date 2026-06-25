"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCreatorDisplay } from "@/lib/username";
import { shortenAddress } from "@/lib/utils";
import type { BountyLeaderboardEntry } from "@/lib/bounties";

type BountyXpLeaderboardProps = {
  creatorWallet: string;
  tokenAddress?: string | null;
  title?: string;
  description?: string;
};

export function BountyXpLeaderboard({
  creatorWallet,
  tokenAddress,
  title = "Quest XP leaderboard",
  description = "Rankings across all quests from this creator. XP is earned when participants complete and verify each bounty.",
}: BountyXpLeaderboardProps) {
  const [entries, setEntries] = useState<BountyLeaderboardEntry[]>([]);
  const [totalQuests, setTotalQuests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorWallet) return;

    const params = new URLSearchParams({ creator: creatorWallet.toLowerCase() });
    if (tokenAddress) params.set("token", tokenAddress.toLowerCase());

    setLoading(true);
    fetch(apiUrl(`/api/bounties/leaderboard?${params.toString()}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setEntries(data?.leaderboard ?? []);
        setTotalQuests(data?.totalQuests ?? 0);
      })
      .catch(() => {
        setEntries([]);
        setTotalQuests(0);
      })
      .finally(() => setLoading(false));
  }, [creatorWallet, tokenAddress]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-amber-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {totalQuests > 0
              ? "No XP earned yet — participants will appear here after completing quests."
              : "Publish quests with XP to start tracking completions."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Participant</th>
                  <th className="py-2 pr-3 text-right">Quests</th>
                  <th className="py-2 text-right">XP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.walletAddress} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{row.rank}</td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">
                        {formatCreatorDisplay(row.username, row.walletAddress)}
                      </span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {shortenAddress(row.walletAddress, 4)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.questsCompleted}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-primary">
                      {row.totalXp.toLocaleString()} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
