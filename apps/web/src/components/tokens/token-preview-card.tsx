"use client";

import Link from "next/link";
import { CheckCircle2, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, cn } from "@/lib/utils";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { motion } from "framer-motion";
import type { TokenCardData } from "@/components/tokens/token-card";
import { tokenCardMetricsClass, tokenCardShellClass } from "@/components/tokens/token-card-styles";
import { SecurityBadges } from "@/components/v2/security-badges";
import { TokenCardHero } from "@/components/tokens/token-card-hero";
import { ContractVerifiedIcon } from "@/components/icons/contract-verified-icon";

function formatTokenAge(iso: string | Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) {
    if (minutes < 1) return "today";
    if (minutes < 60) return `${minutes}min`;
    return `${hours}hr`;
  }
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1yr" : `${years}yr`;
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
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
      ? formatCompactNumber(token.marketCap)
      : "—";
  const volume =
    token.volume24h != null && token.volume24h > 0
      ? formatCompactNumber(token.volume24h)
      : "—";
  const liquidity =
    token.poolStrength != null && token.poolStrength > 0
      ? formatCompactNumber(token.poolStrength)
      : "—";
  const holders =
    token.holderCount > 0 ? formatCompactNumber(token.holderCount) : "—";
  const age = token.createdAt ? formatTokenAge(token.createdAt) : null;
  const displayBadges = (token.badges ?? []).filter((b) => b.id !== "liquidity_locked");
  const hasBadges = displayBadges.length > 0;
  const hasMetaRow = Boolean(token.creatorAddress) || Boolean(age);

  return (
    <motion.div
      className={cn("flex h-full min-h-0 w-full min-w-0", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        href={`/token/${token.contractAddress}`}
        className={cn(tokenCardShellClass, "flex h-full min-h-0 flex-col no-underline")}
      >
        <TokenCardHero
          logoUrl={token.logoUrl}
          symbol={token.symbol}
          name={token.name}
          priority={index < 4}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-1.5">
          <div className="min-w-0 flex-1">
            <div className="min-h-[3rem]">
              <div className="flex flex-wrap items-center gap-0.5">
                <h3 className="truncate text-xs font-bold leading-tight text-foreground group-hover/card:text-primary">
                  {token.name}
                </h3>
                {token.creatorVerified && (
                  <CheckCircle2
                    className="h-2.5 w-2.5 shrink-0 text-emerald-500"
                    aria-label="Verified creator"
                  />
                )}
                {token.contractVerified && (
                  <ContractVerifiedIcon size={14} title="Contract verified" />
                )}
                {token.isFeatured && (
                  <Badge variant="default" className="h-3.5 px-1 text-[8px]">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">${token.symbol}</p>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {marketCap !== "—" ? `$${marketCap}` : "—"}
                </span>
                {marketCap !== "—" && (
                  <span className="text-[10px] font-medium text-muted-foreground">MC</span>
                )}
              </div>
            </div>

            <div
              className={cn(
                "mt-0.5 flex min-h-[1rem] min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] text-muted-foreground",
                !hasMetaRow && "invisible"
              )}
            >
              {token.creatorAddress && (
                <CreatorProfileLink
                  walletAddress={token.creatorAddress}
                  username={token.creatorUsername}
                  profileImageUrl={token.creatorProfileImageUrl}
                />
              )}
              {age && (
                <>
                  <span className="text-border">·</span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-emerald-500/90">
                    <Sprout className="h-3 w-3" aria-hidden />
                    {age}
                  </span>
                </>
              )}
            </div>

            <p
              className={cn(
                "mt-0.5 line-clamp-1 min-h-[1rem] text-[10px] leading-snug text-muted-foreground",
                !token.description?.trim() && "invisible"
              )}
            >
              {token.description?.trim() || "No description"}
            </p>

            <div className={cn("mt-0.5 flex min-h-[16px] flex-wrap items-center gap-0.5", !hasBadges && "invisible")}>
              {displayBadges.length > 0 && <SecurityBadges badges={displayBadges} max={2} />}
            </div>
          </div>

          <div className={tokenCardMetricsClass}>
            <MetricCell label="Liquidity" value={liquidity} />
            <MetricCell label="Volume" value={volume} />
            <MetricCell label="Holders" value={holders} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
