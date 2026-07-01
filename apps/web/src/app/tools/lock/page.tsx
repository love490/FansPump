"use client";

import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LpLockPanel } from "@/components/tools/lp-lock-panel";

function LockPanel() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
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

export default function ToolsLockPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl py-8 text-center text-sm text-muted-foreground">
          Loading lock tools…
        </div>
      }
    >
      <LockPanel />
    </Suspense>
  );
}
