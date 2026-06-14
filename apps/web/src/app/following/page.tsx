"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { CheckCircle2, Users } from "lucide-react";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { Button } from "@/components/ui/button";

type FollowedCreator = {
  walletAddress: string;
  username: string | null;
  profileImageUrl: string | null;
  creatorVerified: boolean;
  tokenCount: number;
  sampleToken?: { name: string; symbol: string; contractAddress: string } | null;
};

export default function FollowingPage() {
  const { address, isConnected } = useAccount();
  const [creators, setCreators] = useState<FollowedCreator[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!address) {
      setCreators([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/user/follows?wallet=${address.toLowerCase()}`)
      .then((r) => r.json())
      .then((d) => setCreators(d.creators ?? []))
      .catch(() => setCreators([]))
      .finally(() => setLoading(false));
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Following</h1>
        <p className="mt-1 text-muted-foreground">
          Creators you follow on FansPump. Visit their profile to unfollow.
        </p>
      </header>

      {!isConnected && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Connect your wallet to follow creators and see them here.
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
          <p className="text-muted-foreground">
            {isConnected ? "You are not following anyone yet." : "Connect your wallet to follow creators."}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/discover?section=featured">Browse creators</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {creators.map((c) => (
            <li key={c.walletAddress} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  {c.creatorVerified && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label="Verified creator" />
                  )}
                  <CreatorProfileLink
                    walletAddress={c.walletAddress}
                    username={c.username}
                    profileImageUrl={c.profileImageUrl}
                  />
                </p>
                {c.sampleToken && (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {c.sampleToken.symbol} · {c.tokenCount} project{c.tokenCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {c.sampleToken && (
                <Link
                  href={`/token/${c.sampleToken.contractAddress}`}
                  className="shrink-0 text-sm text-primary hover:underline"
                >
                  View token
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
