"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import { shortenAddress } from "@/lib/utils";
import { formatLiquidityAmountFromWei } from "@/lib/liquidity/format-amount";

export function MyLiquidityList({
  refreshSeq = 0,
  showBasePools = false,
  emphasizeLp = false,
}: {
  refreshSeq?: number;
  showBasePools?: boolean;
  emphasizeLp?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { positions, loading, refresh } = useMyLiquidityPositions(address);
  const {
    positions: basePools,
    loading: baseLoading,
    refresh: refreshBase,
  } = useBasePoolLpPositions(showBasePools ? address : undefined);

  useEffect(() => {
    if (refreshSeq > 0) {
      void refresh();
      if (showBasePools) void refreshBase();
    }
  }, [refreshSeq, refresh, refreshBase, showBasePools]);

  if (!isConnected) {
    return (
      <p className="text-sm text-muted-foreground">Connect your wallet to see your liquidity positions.</p>
    );
  }

  const listLoading = loading || (showBasePools && baseLoading);
  const hasRows = positions.length > 0 || (showBasePools && basePools.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={listLoading}
          onClick={() => {
            void refresh();
            if (showBasePools) void refreshBase();
          }}
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {listLoading && !hasRows ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !hasRows ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No active positions yet. Add liquidity on the Add Liquidity tab — your positions will appear
          here after a successful transaction.
        </p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {positions.map((p) => (
            <div
              key={`${p.tokenAddress}:${p.pairId}:${p.lpToken || "pending"}`}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {p.tokenSymbol} / {p.pairLabel}
                  </p>
                  {emphasizeLp && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      LP
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground">{shortenAddress(p.tokenAddress, 6)}</p>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {p.pending
                    ? "Confirming on-chain…"
                    : `${formatLiquidityAmountFromWei(p.lpBalance, p.lpDecimals)} LP`}
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={`/liquidity/${p.tokenAddress}?pair=${p.pairId}`}>Remove liquidity</Link>
              </Button>
            </div>
          ))}

          {showBasePools &&
            basePools.map((p) => (
              <div
                key={p.lpToken}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.pairLabel}</p>
                    {emphasizeLp && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        LP
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    {formatLiquidityAmountFromWei(p.lpBalance, p.lpDecimals)} LP
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href="/pools">View pool</Link>
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
