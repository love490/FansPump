"use client";

import { useParams } from "next/navigation";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";

export default function LiquidityPage() {
  const params = useParams();
  const tokenAddress = (params.address as string) ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Add Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          Pair your token with OPN, WOPN, or USDT on the OPNChain DEX.
        </p>
      </header>

      <AddLiquidityPanel initialToken={tokenAddress} />
    </div>
  );
}
