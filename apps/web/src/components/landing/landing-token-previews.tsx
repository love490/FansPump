"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchDiscoverTokens, tokenQueryKeys, type DiscoverFilters } from "@/lib/tokens-api";
import { getActiveChainId } from "@/lib/chain-config/opn";
import { cn, shortenAddress } from "@/lib/utils";
import type { TokenCardData } from "@/components/tokens/token-card";

function TokenPreviewRow({ token, rank }: { token: TokenCardData; rank?: number }) {
  return (
    <Link
      href={`/token/${token.contractAddress}`}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
    >
      {rank != null && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {rank}
        </span>
      )}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        {token.logoUrl ? (
          <Image src={token.logoUrl} alt="" fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-primary">
            {token.symbol.slice(0, 2)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{token.name}</p>
          {token.creatorVerified && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground">{shortenAddress(token.contractAddress, 4)}</p>
      </div>
      {typeof token.volume24h === "number" && token.volume24h > 0 && (
        <span className="text-xs text-muted-foreground">{token.volume24h.toFixed(2)} vol</span>
      )}
    </Link>
  );
}

function TokenPreviewCarousel({
  id,
  title,
  icon,
  tokens,
  isLoading,
  viewAllHref,
  showRank = false,
  perPage = 1,
}: {
  id?: string;
  title: string;
  icon: React.ReactNode;
  tokens: TokenCardData[];
  isLoading: boolean;
  viewAllHref: string;
  showRank?: boolean;
  perPage?: number;
}) {
  const [page, setPage] = useState(0);
  const maxPage = Math.max(0, Math.ceil(tokens.length / perPage) - 1);
  const safePage = Math.min(page, maxPage);
  const visible = tokens.slice(safePage * perPage, safePage * perPage + perPage);

  useEffect(() => {
    setPage((p) => Math.min(p, maxPage));
  }, [maxPage, tokens.length]);

  function prev() {
    setPage((p) => Math.max(0, p - 1));
  }

  function next() {
    setPage((p) => Math.min(maxPage, p + 1));
  }

  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          {icon}
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={isLoading || safePage <= 0 || tokens.length <= perPage}
            onClick={prev}
            aria-label={`Previous ${title}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={isLoading || safePage >= maxPage || tokens.length <= perPage}
            onClick={next}
            aria-label={`Next ${title}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="sm" className="ml-1 hidden sm:inline-flex">
            <Link href={viewAllHref}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : tokens.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No tokens yet — be the first to launch.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((t, i) => (
              <TokenPreviewRow
                key={t.id}
                token={t}
                rank={showRank ? safePage * perPage + i + 1 : undefined}
              />
            ))}
          </div>
          {tokens.length > perPage && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {safePage + 1} / {maxPage + 1}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex justify-center gap-1.5">
                  {Array.from({ length: maxPage + 1 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to page ${i + 1}`}
                      onClick={() => setPage(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === safePage ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <Button asChild variant="ghost" size="sm" className="sm:hidden">
                  <Link href={viewAllHref}>View all</Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function usePreviewTokens(section: string, limit: number, filters?: DiscoverFilters) {
  const chainId = getActiveChainId();
  return useQuery({
    queryKey: tokenQueryKeys.discover(section, chainId, filters),
    queryFn: () => fetchDiscoverTokens(section, limit, filters),
    staleTime: 15_000,
  });
}

export function LandingTrendingPreview() {
  const { data: tokens = [], isLoading } = usePreviewTokens("trending", 12);
  return (
    <TokenPreviewCarousel
      title="Trending Tokens"
      icon={<Flame className="h-5 w-5 text-orange-500" />}
      tokens={tokens}
      isLoading={isLoading}
      viewAllHref="/discover?section=trending"
      showRank
      perPage={1}
    />
  );
}

export function LandingVerifiedPreview() {
  const { data: tokens = [], isLoading } = usePreviewTokens("verified", 12, { verified: true });
  return (
    <TokenPreviewCarousel
      id="verified"
      title="Verified Projects"
      icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
      tokens={tokens}
      isLoading={isLoading}
      viewAllHref="/discover?section=verified&verified=true"
      perPage={1}
    />
  );
}

export function LandingNewlyCreatedPreview() {
  const { data: tokens = [], isLoading } = usePreviewTokens("new", 12);
  return (
    <TokenPreviewCarousel
      title="Newly Created"
      icon={<span className="text-lg">🆕</span>}
      tokens={tokens}
      isLoading={isLoading}
      viewAllHref="/discover?section=new"
      perPage={1}
    />
  );
}
