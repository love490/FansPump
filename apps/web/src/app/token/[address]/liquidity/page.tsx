"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";
import { CreatorLpSecurityPanel } from "@/components/liquidity/creator-lp-security-panel";
import { TokenLiquidityOverview } from "@/components/liquidity/token-liquidity-overview";

type TokenMeta = {
  symbol: string;
  creatorAddress: string;
  featureFlags: number;
  decimals?: number;
};

export default function LiquidityPage() {
  const params = useParams();
  const tokenAddress = (params.address as string) ?? "";
  const { address } = useAccount();
  const [token, setToken] = useState<TokenMeta | null>(null);

  useEffect(() => {
    if (!tokenAddress) return;
    fetch(`/api/tokens/${tokenAddress}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const t = d?.token;
        if (!t) return;
        setToken({
          symbol: t.symbol ?? "Token",
          creatorAddress: t.creatorAddress,
          featureFlags: Number(t.featureFlags ?? 0),
          decimals: 18,
        });
      })
      .catch(() => setToken(null));
  }, [tokenAddress]);

  const isCreator =
    !!address &&
    !!token &&
    address.toLowerCase() === token.creatorAddress.toLowerCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">{isCreator ? "Add Liquidity" : "Liquidity"}</h1>
        <p className="mt-1 text-muted-foreground">
          {isCreator
            ? "Pair your token with OPN, WOPN, or USDT on the OPNChain DEX."
            : "View total pool liquidity and security status for this token."}
        </p>
      </header>

      {isCreator ? (
        <>
          <AddLiquidityPanel initialToken={tokenAddress} />
          <CreatorLpSecurityPanel tokenAddress={tokenAddress} />
        </>
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
