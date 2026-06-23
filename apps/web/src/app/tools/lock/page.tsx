"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LpLockPanel } from "@/components/tools/lp-lock-panel";

export default function ToolsLockPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Lock</h1>
        <p className="mt-1 text-muted-foreground">
          Time-lock LP tokens from your wallet in the on-chain locker contract.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Lock liquidity</CardTitle>
          <CardDescription>
            Pick an LP position from your wallet, choose how long to lock, and confirm in your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LpLockPanel />
        </CardContent>
      </Card>
    </div>
  );
}
