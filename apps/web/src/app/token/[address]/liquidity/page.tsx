"use client";

import { useParams } from "next/navigation";
import { TokenLiquidityOverview } from "@/components/liquidity/token-liquidity-overview";
import { useIsTokenCreator } from "@/hooks/use-is-token-creator";

/** Read-only liquidity view — no manage / add / lock controls (all users). */
export default function TokenLiquidityViewPage() {
  const params = useParams();
  const tokenAddress = (params.address as string) ?? "";
  const { token, loading } = useIsTokenCreator(tokenAddress);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          View total pool liquidity and security status for this token.
        </p>
      </header>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : (
        <TokenLiquidityOverview
          tokenAddress={tokenAddress}
          tokenSymbol={token?.symbol ?? "Token"}
          tokenDecimals={token?.decimals ?? 18}
          featureFlags={token?.featureFlags ?? 0}
        />
      )}
    </div>
  );
}
