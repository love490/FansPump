"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { TokenFeatureBadges } from "@/components/token/token-feature-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoteButtons } from "@/components/tokens/vote-buttons";
import { shortenAddress } from "@/lib/utils";
import { OPN_EXPLORER_BASE } from "@/lib/wagmi";
import { CheckCircle2, ExternalLink, Star, ShoppingCart, TrendingDown, ArrowLeftRight, Droplets, FileCode } from "lucide-react";

interface TokenDetail {
  id: string;
  name: string;
  symbol: string;
  featureFlags: string;
  creatorAddress: string;
  creatorVerified?: boolean;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  website?: string | null;
  github?: string | null;
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
}

export default function TokenPage() {
  const params = useParams();
  const address = params.address as string;
  const { address: wallet } = useAccount();
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setLoadError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    fetch(`/api/tokens/${address}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : `Failed to load token (${r.status})`);
        }
        if (!data?.token) {
          throw new Error("Token not found");
        }
        setToken(data.token);
      })
      .catch((e) => {
        setToken(null);
        setLoadError(e instanceof Error ? e.message : "Failed to load token");
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [address]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (loadError || !token) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-red-600">{loadError ?? "Token not found"}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/discover">Back to discover</Link>
        </Button>
      </div>
    );
  }

  const featureFlags = Number(token.featureFlags);
  const isCreator = wallet?.toLowerCase() === token.creatorAddress;

  async function toggleWatchlist() {
    if (!wallet || !token?.id) return;
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: token.id, walletAddress: wallet }),
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {token.bannerUrl && (
        <div className="relative mb-6 h-40 w-full overflow-hidden rounded-xl bg-iopn-100">
          <Image src={token.bannerUrl} alt="" fill className="object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-iopn-50">
            {token.logoUrl ? (
              <Image src={token.logoUrl} alt="" fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl font-bold text-iopn-600">
                {token.symbol.slice(0, 2)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {token.name}
              {token.creatorVerified && (
                <Badge variant="verified" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verified Creator
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground font-mono text-sm">{shortenAddress(address, 6)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/swap/${address}?mode=buy`}>
              <ShoppingCart className="h-4 w-4" /> Buy Token
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/swap/${address}?mode=sell`}>
              <TrendingDown className="h-4 w-4" /> Sell Token
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/swap/${address}`}>
              <ArrowLeftRight className="h-4 w-4" /> Open DEX
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/token/${address}/liquidity`}>
              <Droplets className="h-4 w-4" /> {isCreator ? "Add Liquidity" : "View Liquidity"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`${OPN_EXPLORER_BASE.replace(/\/$/, "")}/address/${address}`} target="_blank" rel="noopener noreferrer">
              <FileCode className="h-4 w-4" /> View Contract
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={toggleWatchlist}>
            <Star className="h-4 w-4" /> Watchlist
          </Button>
          {isCreator && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/liquidity/${address}`}>
                  <Droplets className="h-4 w-4" /> Lock / Burn LP
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/token/${address}/ownership`}>Ownership</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {token.description && <p className="mt-6 text-muted-foreground">{token.description}</p>}

      <div className="mt-6">
        <TokenFeatureBadges
          tokenAddress={address}
          featureFlags={featureFlags}
          buyTaxBps={token.buyTaxBps}
          sellTaxBps={token.sellTaxBps}
        />
      </div>

      <Card className="mt-8 overflow-hidden">
        <CardHeader>
          <CardTitle>Community sentiment</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <VoteButtons tokenId={token.id} walletAddress={wallet} />
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-4">
        {token.website && (
          <a href={token.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-iopn-600 hover:underline">
            Website <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {token.github && (
          <a href={token.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-iopn-600 hover:underline">
            GitHub <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
