"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Droplets, RefreshCw } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { shortenAddress } from "@/lib/utils";

export function MyLiquidityList({ refreshSeq = 0 }: { refreshSeq?: number }) {
  const { address, isConnected } = useAccount();
  const { positions, loading, refresh } = useMyLiquidityPositions(address);

  useEffect(() => {
    if (refreshSeq > 0) void refresh();
  }, [refreshSeq, refresh]);

  if (!isConnected) {
    return (
      <p className="text-sm text-muted-foreground">Connect your wallet to see your liquidity positions.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => void refresh()}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && positions.length === 0 ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No LP tokens found yet. Add liquidity below — your position will appear here after a successful
          transaction.
        </p>
      ) : (
        <div className="space-y-2">
          {positions.map((p) => (
            <div
              key={`${p.tokenAddress}:${p.pairId}`}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">
                  {p.tokenSymbol} / {p.pairLabel}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{shortenAddress(p.tokenAddress, 6)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.pending
                    ? "Confirming on-chain…"
                    : `LP balance: ${formatUnits(p.lpBalance, p.lpDecimals)} LP`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/liquidity/${p.tokenAddress}?pair=${p.pairId}`}>
                    <Droplets className="mr-2 h-4 w-4" />
                    Manage LP
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
