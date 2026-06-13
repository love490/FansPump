"use client";

import Link from "next/link";
import { CheckCircle2, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, shortenAddress, cn } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";
import { motion } from "framer-motion";
import type { TokenCardData } from "@/components/tokens/token-card";
import { tokenCardShellClass } from "@/components/tokens/token-card-styles";
import { SecurityBadges } from "@/components/v2/security-badges";
import { TokenCardHero, CreatorAvatar } from "@/components/tokens/token-card-hero";

function formatDurationLong(iso: string | Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1yr" : `${years}yr`;
}

export function TokenPreviewCard({
  token,
  index = 0,
  className,
}: {
  token: TokenCardData;
  index?: number;
  className?: string;
}) {
  const marketCap =
    token.marketCap != null && token.marketCap > 0
      ? `$${formatCompactNumber(token.marketCap)}`
      : "—";
  const age = token.createdAt ? formatDurationLong(token.createdAt) : null;
  const creator = formatCreatorDisplay(token.creatorUsername, token.creatorAddress, shortenAddress);

  return (
    <motion.div
      className={cn("h-full min-w-0 w-full", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        href={`/token/${token.contractAddress}`}
        className={cn(tokenCardShellClass, "no-underline")}
      >
        <TokenCardHero
          logoUrl={token.logoUrl}
          symbol={token.symbol}
          name={token.name}
          seed={token.contractAddress}
          priority={index < 4}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-base font-bold leading-tight text-foreground group-hover/card:text-primary sm:text-lg">
                  {token.name}
                </h3>
                {token.creatorVerified && (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                    aria-label="Verified creator"
                  />
                )}
                {token.isFeatured && (
                  <Badge variant="default" className="h-4 px-1.5 text-[9px]">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">${token.symbol}</p>
            </div>
          </div>

          <p className="text-sm sm:text-base">
            <span className="font-bold tabular-nums text-foreground">{marketCap}</span>
            {marketCap !== "—" && (
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">MC</span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <CreatorAvatar username={token.creatorUsername} address={token.creatorAddress} />
            {age && <span>{age}</span>}
            {age && (
              <>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-500/90">
                  <Sprout className="h-3.5 w-3.5" aria-hidden />
                  {age}
                </span>
              </>
            )}
            <span className="hidden min-w-0 truncate sm:inline" title={creator}>
              · {creator}
            </span>
          </div>

          {token.description?.trim() && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {token.description.trim()}
            </p>
          )}

          {(token.badges?.length || (token.trustScore != null && token.trustScore > 0)) && (
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              {token.trustScore != null && token.trustScore > 0 && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary">
                  Trust {Math.round(token.trustScore)}
                </span>
              )}
              {token.badges && token.badges.length > 0 && (
                <SecurityBadges badges={token.badges} max={2} />
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
