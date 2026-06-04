"use client";

import { useState } from "react";
import { SwapPanel } from "@/components/swap/swap-panel";
import { WrapPanel } from "@/components/swap/wrap-panel";
import { cn } from "@/lib/utils";

type Tab = "swap" | "wrap";

export default function SwapPage() {
  const [tab, setTab] = useState<Tab>("swap");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Swap</h1>
        <p className="text-muted-foreground">Buy, sell, and wrap tokens on OPNChain</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(["swap", "wrap"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-5 py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "swap" ? "Swap" : "Wrap / Unwrap"}
          </button>
        ))}
      </div>

      {tab === "swap" ? <SwapPanel /> : <WrapPanel />}
    </div>
  );
}