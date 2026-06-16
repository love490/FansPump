"use client";

import { useActiveWallet } from "@/hooks/useActiveWallet";
import { RefreshCw, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";

export function DashboardBalancePanel() {
  const { walletAddress, hasWallet } = useActiveWallet();
  const { totals, assets, loading, refresh } = useWalletPortfolioBalance();

  if (!hasWallet || !walletAddress) return null;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-5 w-5 text-primary" />
          Total balance
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh balance"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {loading ? "…" : formatBalanceTotal(totals.usd, "USD")}
          </p>
        </div>

        {!loading && assets.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {assets.slice(0, 6).map((asset, index) => (
              <div
                key={`${asset.symbol}-${index}`}
                className="rounded-lg border border-border/80 bg-background/70 px-3 py-2 text-sm"
              >
                <p className="font-medium">{asset.name !== asset.symbol ? asset.name : asset.symbol}</p>
                <p className="mt-0.5 tabular-nums text-muted-foreground">
                  {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                  {asset.symbol}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBalanceTotal(asset.usdValue, "USD")}
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading && assets.length === 0 && (
          <p className="text-sm text-muted-foreground">No token balances detected in this wallet yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
