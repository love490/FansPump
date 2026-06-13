"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { TokenPreviewCard } from "@/components/tokens/token-preview-card";
import { tokenCardGridClass, tokenCardSkeletonClass } from "@/components/tokens/token-card-styles";
import { useQuery } from "@tanstack/react-query";
import { fetchDiscoverTokens, tokenQueryKeys } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { cn } from "@/lib/utils";

export function HomeDashboard() {
  const chainId = getActiveChainId();

  const { data: newTokens = [], isLoading: loadingNew } = useQuery({
    queryKey: tokenQueryKeys.discover("new", chainId),
    queryFn: () => fetchDiscoverTokens("new", 6),
    staleTime: 15_000,
  });

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Newly Created</h1>
        <Button asChild variant="ghost" size="sm">
          <Link href="/discover?section=new">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {loadingNew ? (
        <div className={tokenCardGridClass}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={tokenCardSkeletonClass()} />
          ))}
        </div>
      ) : newTokens.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          No tokens yet — be the first to launch on FansPump.
        </p>
      ) : (
        <div className={cn(tokenCardGridClass, "items-stretch")}>
          {newTokens.map((t, i) => (
            <div key={t.id} className="h-full">
              <TokenPreviewCard token={t} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
