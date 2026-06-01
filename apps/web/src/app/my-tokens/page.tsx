"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { TokenCard, type TokenCardData } from "@/components/tokens/token-card";
import { Button } from "@/components/ui/button";

export default function MyTokensPage() {
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<TokenCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setTokens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/tokens?creator=${address}&limit=100`)
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens ?? []))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">My Tokens</h1>
        <p className="mt-1 text-muted-foreground">Tokens you created on FansPump.</p>
      </header>

      {!isConnected ? (
        <p className="text-muted-foreground">Connect your wallet to see your tokens.</p>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">You have not launched a token yet.</p>
          <Button asChild className="mt-4">
            <Link href="/create">Create Token</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t, i) => (
            <TokenCard key={t.id} token={t} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
