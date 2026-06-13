"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { TokenCard } from "@/components/tokens/token-card";
import { tokenCardGridClass } from "@/components/tokens/token-card-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMyTokens } from "@/lib/token-register";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { tokenQueryKeys } from "@/lib/tokens-api";

export function DashboardMyTokensPanel() {
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
  });

  if (!isConnected || !address) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-5 w-5 text-primary" />
            My Tokens
          </CardTitle>
          <CardDescription>Tokens you created on FansPump.</CardDescription>
        </div>
        {!isLoading && (
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
            <p className="text-sm text-red-700 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load your tokens"}
            </p>
            <Button className="mt-4" type="button" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : tokens.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">You have not launched a token yet.</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/create">Create Token</Link>
            </Button>
          </div>
        ) : (
          <div className={`${tokenCardGridClass} items-stretch`}>
            {tokens.map((t, i) => (
              <div key={t.id} className="h-full">
                <TokenCard token={t} index={i} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
