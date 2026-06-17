"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { TokenCard } from "@/components/tokens/token-card";
import { tokenCardGridClass } from "@/components/tokens/token-card-styles";
import { Button } from "@/components/ui/button";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { fetchMyTokens } from "@/lib/token-register";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { tokenQueryKeys } from "@/lib/tokens-api";
import { cn } from "@/lib/utils";

export function DashboardMyTokensTab() {
  const { walletAddress, hasWallet } = useActiveWallet();
  const chainId = getActiveChainId();

  const {
    data: tokens = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: tokenQueryKeys.myTokens(walletAddress ?? "", chainId),
    queryFn: () => fetchMyTokens(walletAddress!),
    enabled: hasWallet,
    staleTime: 30_000,
  });

  if (!hasWallet) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Connect or link a wallet to see tokens you created.
      </p>
    );
  }

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading your tokens…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tokens you launched on FansPump.</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={isFetching}
          onClick={() => void refetch()}
          aria-label="Refresh tokens"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-400">
            {error instanceof Error ? error.message : "Failed to load your tokens"}
          </p>
          <Button className="mt-4" type="button" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You have not launched a token yet. Create one to see it here.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/create">Create token</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/swap">Swap</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className={`${tokenCardGridClass} items-stretch`}>
          {tokens.map((token, index) => (
            <div key={token.id} className="h-full">
              <TokenCard token={token} index={index} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
