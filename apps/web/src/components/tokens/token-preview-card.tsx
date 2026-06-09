"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber, formatTimeAgo, shortenAddress } from "@/lib/utils";
import { formatCreatorDisplay } from "@/lib/username";
import { motion } from "framer-motion";
import type { TokenCardData } from "@/components/tokens/token-card";

export function TokenPreviewCard({
  token,
  index = 0,
}: {
  token: TokenCardData;
  index?: number;
}) {
  const mc =
    token.marketCap != null && token.marketCap > 0
      ? formatCompactNumber(token.marketCap)
      : "—";
  const age = token.createdAt ? formatTimeAgo(token.createdAt) : "—";
  const creator = formatCreatorDisplay(token.creatorUsername, token.creatorAddress, shortenAddress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:gap-4 sm:p-4">
        <Link
          href={`/token/${token.contractAddress}`}
          className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-iopn-50 ring-1 ring-border/60 sm:h-12 sm:w-12 sm:rounded-xl">
            {token.logoUrl ? (
              <Image src={token.logoUrl} alt={token.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-iopn-600">
                {token.symbol.slice(0, 2)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary sm:text-base">
                    {token.name}
                  </p>
                  {token.creatorVerified && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Verified" />
                  )}
                </div>
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">${token.symbol}</p>
              </div>
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground sm:text-xs">
                {age}
              </span>
            </div>

            <div className="mt-2 text-[11px] sm:text-xs">
              <span className="text-muted-foreground">MC </span>
              <span className="font-semibold tabular-nums text-foreground">{mc}</span>
              {mc !== "—" && <span className="ml-0.5 text-muted-foreground">OPN</span>}
            </div>
          </div>
        </Link>

        <div className="hidden min-w-0 shrink-0 text-right text-[11px] sm:block sm:text-xs">
          <p className="text-muted-foreground">Creator</p>
          {token.creatorAddress ? (
            <Link
              href={`/creator/${token.creatorAddress}`}
              className={`mt-0.5 block max-w-[7rem] truncate font-medium text-foreground hover:text-primary hover:underline ${
                token.creatorUsername ? "" : "font-mono"
              }`}
            >
              {creator}
            </Link>
          ) : (
            <p className="mt-0.5 font-medium text-foreground">{creator}</p>
          )}
        </div>

        <div className="min-w-0 shrink-0 text-right text-[11px] sm:hidden">
          <span className="text-muted-foreground">Creator </span>
          {token.creatorAddress ? (
            <Link
              href={`/creator/${token.creatorAddress}`}
              className={`font-medium text-foreground hover:text-primary hover:underline ${
                token.creatorUsername ? "" : "font-mono"
              }`}
            >
              {creator}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{creator}</span>
          )}
        </div>

        {token.isFeatured && (
          <Badge variant="default" className="hidden shrink-0 lg:inline-flex">
            Featured
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
