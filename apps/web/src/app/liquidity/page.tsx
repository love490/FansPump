"use client";

import { useCallback, useState } from "react";
import { LiquidityWorkspace } from "@/components/liquidity/liquidity-workspace";

export default function LiquidityPage() {
  const [refreshSeq, setRefreshSeq] = useState(0);
  const onLiquidityAdded = useCallback(() => setRefreshSeq((n) => n + 1), []);

  return (
    <div className="mx-auto max-w-3xl py-2 sm:py-4">
      <LiquidityWorkspace refreshSeq={refreshSeq} onLiquidityAdded={onLiquidityAdded} />
    </div>
  );
}
