"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { liquidityUrl } from "@/lib/navigation/liquidity-routes";

/** Redirect legacy add-liquidity URL to the main liquidity page. */
export default function TokenLiquidityAddRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const tokenAddress = (params.address as string) ?? "";

  useEffect(() => {
    if (!tokenAddress) {
      router.replace(liquidityUrl());
      return;
    }
    router.replace(liquidityUrl({ token: tokenAddress }));
  }, [tokenAddress, router]);

  return (
    <div className="mx-auto max-w-3xl py-8 text-center text-sm text-muted-foreground">
      Redirecting to liquidity…
    </div>
  );
}
