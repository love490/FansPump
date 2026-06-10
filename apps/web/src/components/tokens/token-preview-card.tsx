"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatTimeAgo, shortenAddress, cn } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";
import { motion } from "framer-motion";
import type { TokenCardData } from "@/components/tokens/token-card";

export function TokenPreviewCard({
  token,
  index = 0,
  compact = false,
}: {
  token: TokenCardData;
  index?: number;
  /** Hide side columns when many cards share a row on smaller widths. */
  compact?: boolean;
}) {
  const mc =
    token.marketCap != null && token.marketCap > 0
      ? formatCompactNumber(token.marketCap)
      : "—";
  const age = token.createdAt ? formatTimeAgo(token.createdAt) : "—";
  const creator = formatCreatorDisplay(token.creatorUsername, token.creatorAddress, shortenAddress);

  return (
    <motion.div
      className="min-w-0 w-full"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="group flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-border bg-card p-2.5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:gap-3 sm:p-3 md:gap-4 md:p-4">
        <Link
          href={`/token/${token.contractAddress}`}
          className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:gap-4"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-iopn-50 ring-1 ring-border/60 sm:h-11 sm:w-11 md:h-12 md:w-12 md:rounded-xl">
            {token.logoUrl ? (
              <Image src={token.logoUrl} alt={token.name} fill className="object-cover" sizes="48px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-iopn-600 sm:text-sm">
                {token.symbol.slice(0, 2)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1.5 sm:gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary sm:text-sm md:text-base">
                    {token.name}
                  </p>
                  {token.creatorVerified && (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-green-600 sm:h-3.5 sm:w-3.5" aria-label="Verified" />
                  )}
                </div>
                <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-xs md:text-sm">
                  ${token.symbol}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground sm:px-2 sm:text-[11px] md:text-xs">
                {age}
              </span>
            </div>

            <div className="mt-1 truncate text-[10px] sm:mt-1.5 sm:text-[11px] md:text-xs">
              <span className="text-muted-foreground">MC </span>
              <span className="font-semibold tabular-nums text-foreground">{mc}</span>
              {mc !== "—" && <span className="ml-0.5 text-muted-foreground">OPN</span>}
            </div>

            {compact && (
              <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-[11px]">
                <span className="text-muted-foreground/80">Creator </span>
                <span className={cn("font-medium text-foreground", !token.creatorUsername && "font-mono")}>
                  {creator}
                </span>
              </p>
            )}
          </div>
        </Link>

        {!compact && (
          <div className="hidden min-w-0 max-w-[5.5rem] shrink-0 text-right text-[10px] sm:block sm:max-w-[7rem] sm:text-[11px] md:text-xs">
            <p className="text-muted-foreground">Creator</p>
            {token.creatorAddress ? (
              <Link
                href={`/creator/${token.creatorAddress}`}
                className={cn(
                  "mt-0.5 block truncate font-medium text-foreground hover:text-primary hover:underline",
                  !token.creatorUsername && "font-mono"
                )}
              >
                {creator}
              </Link>
            ) : (
              <p className="mt-0.5 truncate font-medium text-foreground">{creator}</p>
            )}
          </div>
        )}

        {token.isFeatured && !compact && (
          <Badge variant="default" className="hidden shrink-0 xl:inline-flex">
            Featured
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
