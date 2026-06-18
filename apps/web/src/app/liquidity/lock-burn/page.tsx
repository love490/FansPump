"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyLiquidityLockBurn } from "@/components/liquidity/my-liquidity-lock-burn";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";

export default function LiquidityLockBurnPage() {
  const { address, isConnected } = useAccount();
  const { positions, loading } = useMyLiquidityPositions(address);
  const active = positions.filter((p) => !p.pending && p.lpBalance > 0n);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/liquidity">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to liquidity
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Lock &amp; burn</h1>
          <p className="mt-1 text-muted-foreground">
            Time-lock LP or permanently burn tokens for projects you created.
          </p>
        </div>
      </header>

      {!isConnected ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Connect your wallet to view lock and burn options for your LP positions.
        </p>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading positions…</p>
      ) : active.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No LP tokens in your wallet yet. Add liquidity first, then return here to lock or burn.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/liquidity">Add liquidity</Link>
          </Button>
        </div>
      ) : (
        <MyLiquidityLockBurn positions={positions} embedded />
      )}
    </div>
  );
}
