"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";import { TokenBurnPanel } from "@/components/tools/token-burn-panel";

export default function ToolsBurnPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Burn</h1>
        <p className="mt-1 text-muted-foreground">
          Permanently reduce token supply. Paste any burnable ERC-20 address or pick from your wallet.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Burn supply</CardTitle>
          <CardDescription>Only works for tokens with the burn feature enabled at deploy.</CardDescription>
        </CardHeader>
        <CardContent>
          <TokenBurnPanel />
        </CardContent>
      </Card>
    </div>
  );
}
