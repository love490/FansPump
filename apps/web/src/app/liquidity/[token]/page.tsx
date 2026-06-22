"use client";

import { useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  liquidityUrl,
  TOOLS_LOCK_PATH,
} from "@/lib/navigation/liquidity-routes";
import { parseLiquidityPairId } from "@/lib/liquidity/pair-tokens";

/** Redirect legacy `/liquidity/[token]` URLs to the main liquidity or tools pages. */
export default function LegacyLiquidityTokenRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenAddress = (params.token as string) ?? "";

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (hash === "lock" || hash === "burn") {
      router.replace(TOOLS_LOCK_PATH);
      return;
    }

    const pair = searchParams.get("pair");
    router.replace(
      liquidityUrl({
        token: tokenAddress || undefined,
        tab: "remove",
        pair: pair ? parseLiquidityPairId(pair) : undefined,
      })
    );
  }, [tokenAddress, searchParams, router]);

  return (
    <div className="mx-auto max-w-3xl py-8 text-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
