"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";
import { CreatorLpSecurityPanel } from "@/components/liquidity/creator-lp-security-panel";
import { useIsTokenCreator } from "@/hooks/use-is-token-creator";

/** Creator-only: add liquidity and open lock/burn tools. */
export default function TokenLiquidityAddPage() {
  const params = useParams();
  const router = useRouter();
  const tokenAddress = (params.address as string) ?? "";
  const { isCreator, loading } = useIsTokenCreator(tokenAddress);

  useEffect(() => {
    if (loading) return;
    if (!isCreator) {
      router.replace(`/token/${tokenAddress}/liquidity`);
    }
  }, [loading, isCreator, tokenAddress, router]);

  if (loading || !isCreator) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Add Liquidity</h1>
        <p className="mt-1 text-muted-foreground">
          Pair your token with OPN, WOPN, or USDT on the OPNChain DEX.
        </p>
      </header>

      <AddLiquidityPanel initialToken={tokenAddress} showManageLink />
      <CreatorLpSecurityPanel tokenAddress={tokenAddress} />
    </div>
  );
}
