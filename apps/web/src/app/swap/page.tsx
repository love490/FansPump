"use client";

import { SwapPanel } from "@/components/swap/swap-panel";

export default function SwapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Swap</h1>
        <p className="text-muted-foreground">
          Buy, sell, wrap, and unwrap tokens on OPNChain — OPN, WOPN, USDT, and project tokens in one place.
        </p>
      </div>

      <SwapPanel />
    </div>
  );
}
