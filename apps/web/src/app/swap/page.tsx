"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SwapPanel } from "@/components/swap/swap-panel";
import { SwapModeSubNav, getSwapViewTab } from "@/components/swap/swap-mode-sub-nav";

function SwapPageContent() {
  const searchParams = useSearchParams();
  const tab = getSwapViewTab(searchParams);
  const isAdvanced = tab === "advanced";

  return (
    <div className="space-y-6">
      <SwapModeSubNav />

      {!isAdvanced && (
        <div>
          <h1 className="text-2xl font-bold">Swap</h1>
          <p className="text-muted-foreground">Trade tokens instantly on OPNChain.</p>
        </div>
      )}

      {isAdvanced ? (
        <SwapPanel fixedPair="opn-usdt" />
      ) : (
        <SwapPanel />
      )}
    </div>
  );
}

export default function SwapPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading swap…</p>}>
      <SwapPageContent />
    </Suspense>
  );
}
