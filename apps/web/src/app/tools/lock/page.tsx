"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { MyLiquidityLockBurn } from "@/components/liquidity/my-liquidity-lock-burn";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { liquidityUrl } from "@/lib/navigation/liquidity-routes";

export default function ToolsLockPage() {
  const { address, isConnected } = useAccount();
  const { positions, loading } = useMyLiquidityPositions(address);
  const active = positions.filter((p) => !p.pending && p.lpBalance > 0n);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Lock</h1>
        <p className="mt-1 text-muted-foreground">
          Time-lock LP or permanently burn liquidity for tokens in your wallet.
        </p>
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
            <Link href={liquidityUrl()}>Add liquidity</Link>
          </Button>
        </div>
      ) : (
        <MyLiquidityLockBurn positions={positions} embedded />
      )}
    </div>
  );
}
