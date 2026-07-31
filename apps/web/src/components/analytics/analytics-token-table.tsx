"use client";

import Link from "next/link";
import Image from "next/image";
import type { AnalyticsTokenRow } from "@iopn/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tokenPageHref } from "@/lib/tokens/token-route";
import { formatCompactUsd } from "@/lib/dashboard/wallet-balance";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, ExternalLink } from "lucide-react";

function TokenLogo({ token }: { token: AnalyticsTokenRow }) {
  if (token.logoUrl) {
    return (
      <Image
        src={token.logoUrl}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-border">
      {token.symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function AnalyticsTokenTable({
  tokens,
  compact,
}: {
  tokens: AnalyticsTokenRow[];
  compact?: boolean;
}) {
  if (tokens.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Token</th>
            {!compact && <th className="px-3 py-2.5 font-medium">Price</th>}
            <th className="px-3 py-2.5 font-medium">24H</th>
            {!compact && <th className="px-3 py-2.5 font-medium">Liquidity</th>}
            <th className="px-3 py-2.5 font-medium">Volume</th>
            <th className="px-3 py-2.5 font-medium">Trust</th>
            <th className="px-3 py-2.5 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
              <td className="px-3 py-3 tabular-nums text-muted-foreground">{token.rank}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <TokenLogo token={token} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{token.name}</p>
                    <p className="text-xs text-muted-foreground">${token.symbol}</p>
                  </div>
                </div>
              </td>
              {!compact && (
                <td className="px-3 py-3 tabular-nums">
                  {token.priceEstimate < 0.01
                    ? token.priceEstimate.toExponential(2)
                    : token.priceEstimate.toFixed(4)}
                </td>
              )}
              <td className="px-3 py-3">
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    token.change24h >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {token.change24h >= 0 ? "+" : ""}
                  {token.change24h.toFixed(2)}%
                </span>
              </td>
              {!compact && (
                <td className="px-3 py-3 tabular-nums">
                  {formatCompactUsd(token.poolStrength)}
                </td>
              )}
              <td className="px-3 py-3 tabular-nums">{token.volume24h.toFixed(2)} OPN</td>
              <td className="px-3 py-3">
                <Badge variant="secondary" className="tabular-nums">
                  {Math.round(token.trustScore)}
                </Badge>
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-end gap-1">
                  <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                    <Link href={tokenPageHref(token.contractAddress, token.symbol)}>
                      <ExternalLink className="mr-1 h-3 w-3" /> View
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="h-8 px-2 text-xs">
                    <Link href={`/swap/${token.contractAddress}`}>
                      <ArrowLeftRight className="mr-1 h-3 w-3" /> Trade
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsLaunchCard({ token }: { token: AnalyticsTokenRow }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <TokenLogo token={token} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{token.name}</p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {token.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">${token.symbol}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Launched {new Date(token.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Market cap</p>
          <p className="font-medium tabular-nums">{formatCompactUsd(token.marketCapEstimate)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Liquidity</p>
          <p className="font-medium tabular-nums">{formatCompactUsd(token.poolStrength)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Trust</p>
          <p className="font-medium tabular-nums">{Math.round(token.trustScore)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Views</p>
          <p className="font-medium tabular-nums">{token.viewCount.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={tokenPageHref(token.contractAddress, token.symbol)}>View Project</Link>
        </Button>
        <Button asChild size="sm" className="flex-1">
          <Link href={`/swap/${token.contractAddress}`}>Trade</Link>
        </Button>
      </div>
    </div>
  );
}
