"use client";

import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";

export default function MyLiquidityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          Add liquidity for any token — paste a contract address, pick from your wallet, and pair with
          OPN, WOPN, or USDT.
        </p>
      </header>

      <AddLiquidityPanel />
    </div>
  );
}
