"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatTimeAgo, shortenAddress, cn } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";
import { motion } from "framer-motion";
import type { TokenCardData } from "@/components/tokens/token-card";
import { TokenLogo } from "@/components/tokens/token-logo";
import { tokenCardShellClass } from "@/components/tokens/token-card-styles";

type MetricCellProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

function MetricCell({ label, value, emphasis }: MetricCellProps) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:text-[11px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate tabular-nums text-foreground",
          emphasis ? "text-sm font-bold md:text-base" : "text-xs font-semibold md:text-sm"
        )}
      >
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
  const age = token.createdAt ? formatTimeAgo(token.createdAt) : null;
  const creator = formatCreatorDisplay(token.creatorUsername, token.creatorAddress, shortenAddress);
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
        <div className="flex min-h-0 flex-1 gap-3 md:gap-4">
          <TokenLogo
            src={token.logoUrl}
            symbol={token.symbol}
            name={token.name}
            layout="responsive"
            className="shrink-0 ring-1 ring-border/50"
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="truncate text-base font-bold leading-tight text-foreground group-hover/card:text-primary md:text-lg lg:text-xl">
                    {token.name}
                  </h3>
                  {token.creatorVerified && (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-500"
                      aria-label="Verified creator"
                    />
                  )}
                  {token.isFeatured && (
                    <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground md:text-sm">
                  ${token.symbol}
                </p>
              </div>
              {age && (
                <span className="shrink-0 rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground md:text-xs">
                  {age}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-1.5 md:mt-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:text-xs">
                Market Cap
              </span>
              <span className="text-lg font-bold tabular-nums text-foreground md:text-xl lg:text-2xl">
                {marketCap}
              </span>
              {marketCap !== "—" && (
                <span className="text-xs font-medium text-muted-foreground md:text-sm">OPN</span>
              )}
            </div>

            <p className="mt-1.5 truncate text-xs text-muted-foreground md:mt-2 md:text-sm">
              <span className="text-muted-foreground/80">Creator </span>
              <span
                className={cn(
                  "font-medium text-foreground/90",
                  !token.creatorUsername && "font-mono"
                )}
              >
                {creator}
              </span>
            </p>

            <div className="mt-auto grid grid-cols-4 gap-2 border-t border-border/50 pt-3 md:gap-3 md:pt-4">
              <MetricCell label="Liquidity" value={liquidity} />
              <MetricCell label="Volume" value={volume} />
              <MetricCell label="Holders" value={holders} />
              <MetricCell label="Change" value="—" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
