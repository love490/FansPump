"use client";

import Link from "next/link";
import { TokenLogo } from "@/components/tokens/token-logo";
import type { TokenCardData } from "@/components/tokens/token-card";
import { formatCompactNumber, shortenAddress } from "@/lib/utils";

function formatMetric(value: number | null | undefined): string {
  if (value == null || value <= 0) return "—";
  return `$${formatCompactNumber(value)}`;
}

export function CreatorTokenList({ tokens }: { tokens: TokenCardData[] }) {
  if (tokens.length === 0) {
    return <p className="text-muted-foreground">No tokens created yet.</p>;
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {tokens.map((token) => (
        <Link
          key={token.id}
          href={`/token/${token.contractAddress}`}
          className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/30"
        >
          <TokenLogo
            src={token.logoUrl}
            symbol={token.symbol}
            name={token.name}
            layout="fixed"
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold uppercase tracking-wide">{token.symbol}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{token.name}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {shortenAddress(token.contractAddress, 6)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums">{formatMetric(token.marketCap)}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {token.volume24h != null && token.volume24h > 0
                ? `${formatMetric(token.volume24h)} vol`
                : "—"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
