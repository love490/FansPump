"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { CheckCircle2, Users } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

type VerifiedCreator = {
  walletAddress: string;
  tokenCount: number;
  sampleToken?: { name: string; symbol: string; contractAddress: string };
};

export default function FollowingPage() {
  const { isConnected } = useAccount();
  const [creators, setCreators] = useState<VerifiedCreator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tokens?section=new&limit=100")
      .then((r) => r.json())
      .then((d) => {
        const tokens = d.tokens ?? [];
        const byCreator = new Map<string, VerifiedCreator>();
        for (const t of tokens) {
          if (!t.creatorVerified || !t.creatorAddress) continue;
          const key = t.creatorAddress.toLowerCase();
          const existing = byCreator.get(key);
          if (existing) {
            existing.tokenCount += 1;
          } else {
            byCreator.set(key, {
              walletAddress: key,
              tokenCount: 1,
              sampleToken: { name: t.name, symbol: t.symbol, contractAddress: t.contractAddress },
            });
          }
        }
        setCreators([...byCreator.values()]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Following</h1>
        <p className="mt-1 text-muted-foreground">
          Discover verified creators on FansPump. Full follow feeds are coming soon.
        </p>
      </header>

      {!isConnected && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Connect your wallet to save follows when the feature launches.
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No verified creators to show yet.</p>
          <Link href="/discover?section=featured" className="mt-4 inline-block text-sm text-primary hover:underline">
            Browse featured projects
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {creators.map((c) => (
            <li key={c.walletAddress} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-mono text-sm">{shortenAddress(c.walletAddress, 4)}</span>
                </p>
                {c.sampleToken && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {c.sampleToken.name} ({c.sampleToken.symbol}) · {c.tokenCount} project
                    {c.tokenCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {c.sampleToken && (
                <Link
                  href={`/token/${c.sampleToken.contractAddress}`}
                  className="shrink-0 text-sm text-primary hover:underline"
                >
                  View
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
