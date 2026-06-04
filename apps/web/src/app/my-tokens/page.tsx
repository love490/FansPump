"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TokenCard } from "@/components/tokens/token-card";
import { Button } from "@/components/ui/button";
import { fetchMyTokens } from "@/lib/token-register";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { tokenQueryKeys } from "@/lib/tokens-api";

export default function MyTokensPage() {
  const { address, isConnected } = useAccount();
  const chainId = getActiveChainId();

  const {
    data: tokens = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: tokenQueryKeys.myTokens(address ?? "", chainId),
    queryFn: () => fetchMyTokens(address!),
    enabled: Boolean(isConnected && address),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Tokens</h1>
          <p className="mt-1 text-muted-foreground">Tokens you created on FansPump.</p>
        </div>
        {isConnected && !isLoading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        )}
      </header>

      {!isConnected ? (
        <p className="text-muted-foreground">Connect your wallet to see your tokens.</p>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : "Failed to load your tokens"}
          </p>
          <Button className="mt-4" type="button" onClick={() => void refetch()}>
            Retry
          </Button>
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
