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
  const { totals, loading, refresh } = useWalletPortfolioBalance();

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
      <CardContent>
        <p className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
          {loading ? "…" : formatBalanceTotal(totals.usd, "USD")}
        </p>
        {!loading && totals.usd <= 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No token balances detected in this wallet yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
