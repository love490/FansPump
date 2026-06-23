"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LpLockPanel } from "@/components/tools/lp-lock-panel";

export default function ToolsLockPage() {
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
