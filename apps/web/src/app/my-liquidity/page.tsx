"use client";

import { useCallback, useState } from "react";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";
import { MyLiquidityList } from "@/components/liquidity/my-liquidity-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyLiquidityPage() {
  const [refreshSeq, setRefreshSeq] = useState(0);
  const onLiquidityAdded = useCallback(() => setRefreshSeq((n) => n + 1), []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          Add liquidity for any token — paste a contract address, pick from your wallet, and pair with
          OPN, WOPN, or USDT.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>My liquidity</CardTitle>
        </CardHeader>
        <CardContent>
          <MyLiquidityList refreshSeq={refreshSeq} />
        </CardContent>
      </Card>

      <AddLiquidityPanel showManageLink={false} onLiquidityAdded={onLiquidityAdded} />
    </div>
  );
}
