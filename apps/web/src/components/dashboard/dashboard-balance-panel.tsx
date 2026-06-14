"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { RefreshCw, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";
import {
  formatBalanceTotal,
  getStoredBalanceCurrency,
  storeBalanceCurrency,
  type BalanceDisplayCurrency,
} from "@/lib/dashboard/wallet-balance";

export function DashboardBalancePanel() {
  const { address, isConnected } = useAccount();
  const { totals, assets, opnUsdRate, loading, refresh } = useWalletPortfolioBalance();
  const [currency, setCurrency] = useState<BalanceDisplayCurrency>("USD");

  useEffect(() => {
    setCurrency(getStoredBalanceCurrency());
  }, []);

  function switchCurrency(next: BalanceDisplayCurrency) {
    setCurrency(next);
    storeBalanceCurrency(next);
  }

  if (!isConnected || !address) return null;

  const displayTotal = currency === "USD" ? totals.usd : totals.opn;
  const altTotal = currency === "USD" ? totals.opn : totals.usd;
  const altLabel = currency === "USD" ? "OPN" : "USD";

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" />
            Total balance
          </CardTitle>
          <CardDescription>Your OPN Network wallet holdings on FansPump.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(["USD", "OPN"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchCurrency(option)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                  currency === option
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option}
              </button>
            ))}
          </div>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {loading ? "…" : formatBalanceTotal(displayTotal, currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            ≈ {loading ? "…" : formatBalanceTotal(altTotal, altLabel)} · 1 OPN ≈ $
            {opnUsdRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
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
                  {formatBalanceTotal(
                    currency === "USD" ? asset.usdValue : asset.opnValue,
                    currency
                  )}
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
