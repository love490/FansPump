"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { TokenCard, type TokenCardData } from "@/components/tokens/token-card";

export default function WatchlistPage() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<TokenCardData[]>([]);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/watchlist?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens ?? []));
  }, [address]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Watchlist</h1>
      <p className="text-muted-foreground mb-8">Tokens you are tracking across the IOPn ecosystem.</p>

      {!address ? (
        <p className="text-muted-foreground">Connect your wallet to view your watchlist.</p>
      ) : tokens.length === 0 ? (
        <p className="text-muted-foreground">Your watchlist is empty.</p>
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
