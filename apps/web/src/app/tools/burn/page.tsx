"use client";

import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LpBurnPanel } from "@/components/tools/lp-burn-panel";
import { TokenBurnPanel } from "@/components/tools/token-burn-panel";

function BurnPanels() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Burn</h1>
        <p className="mt-1 text-muted-foreground">
          Permanently burn LP from your wallet or reduce token supply for burnable ERC-20s.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Burn LP</CardTitle>
          <CardDescription>
            Send LP tokens to a permanent burn wallet. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LpBurnPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Burn token supply</CardTitle>
          <CardDescription>
            Only works for tokens with the burn function enabled at deploy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenBurnPanel />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ToolsBurnPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl py-8 text-center text-sm text-muted-foreground">
          Loading burn tools…
        </div>
      }
    >
      <BurnPanels />
    </Suspense>
  );
}
