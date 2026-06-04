"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SwapPanel } from "@/components/swap/swap-panel";
import type { SwapMode } from "@/lib/swap/constants";

function TokenSwapContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tokenAddress = params.tokenAddress as string;
  const mode = (searchParams.get("mode") === "sell" ? "sell" : "buy") as SwapMode;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Swap Token</h1>
        <p className="font-mono text-sm text-muted-foreground">{tokenAddress}</p>
      </div>
      <SwapPanel initialToken={tokenAddress} initialMode={mode} />
    </div>
  );
}

export default function TokenSwapPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading swap…</p>}>
      <TokenSwapContent />
    </Suspense>
  );
}
