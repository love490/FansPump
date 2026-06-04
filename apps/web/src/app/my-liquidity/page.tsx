"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/utils";
import { getActiveChainId } from "@/lib/chain-config/opn";

type CreatorToken = {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
};

export default function MyLiquidityPage() {
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<CreatorToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setTokens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/tokens?creator=${address}&limit=100&chainId=${getActiveChainId()}`)
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens ?? []))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          Add liquidity to your tokens paired with OPN on OPNChain.
        </p>
      </header>

      {!isConnected ? (
        <p className="text-muted-foreground">Connect your wallet to manage liquidity.</p>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
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
        <div className="space-y-3">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">
                  {t.name} ({t.symbol})
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {shortenAddress(t.contractAddress, 6)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Default pair: {t.symbol} / OPN</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/token/${t.contractAddress}/liquidity`}>
                    <Droplets className="mr-2 h-4 w-4" />
                    Add liquidity
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/liquidity/${t.contractAddress}`}>Manage LP</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
