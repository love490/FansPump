"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TokenAboutCard } from "@/components/token/token-about-card";
import { AnnouncementsSection } from "@/components/token/announcements-section";
import { TokenAnalyticsSection } from "@/components/token/token-analytics-section";
import { TokenHealthPanel, TrustScorePanel } from "@/components/trust/TrustScorePanel";
import { TokenBanner } from "@/components/tokens/token-banner";
import { TokenLogo } from "@/components/tokens/token-logo";
import { TOKEN_CATEGORY_LABELS, type TokenCategoryId } from "@iopn/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoteButtons } from "@/components/tokens/vote-buttons";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { shortenAddress, cn } from "@/lib/utils";
import { liquidityUrl, tokenLiquidityViewUrl, TOOLS_LOCK_PATH } from "@/lib/navigation/liquidity-routes";
import { OPN_EXPLORER_BASE } from "@/lib/wagmi";
import { ExternalLink, Star, ShoppingCart, TrendingDown, ArrowLeftRight, Droplets, FileCode } from "lucide-react";

interface TokenDetail {
  id: string;
  name: string;
  symbol: string;
  featureFlags: string;
  creatorAddress: string;
  creatorUsername?: string | null;
  creatorVerified?: boolean;
  category?: string;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  website?: string | null;
  github?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  createdAt?: string | null;
  creatorFollowers?: number;
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
}

export default function TokenPage() {
  const params = useParams();
  const address = params.address as string;
  const { walletAddress, hasWallet } = useActiveWallet();
  const wallet = walletAddress;
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setLoadError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    fetch(apiUrl(`/api/tokens/${address}`), { signal: controller.signal })
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

  useEffect(() => {
    if (!wallet || !token?.id) {
      setIsWatchlisted(false);
      return;
    }
    fetch(apiUrl(`/api/watchlist?wallet=${wallet}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const ids = new Set((data?.tokens ?? []).map((t: { id: string }) => t.id));
        setIsWatchlisted(ids.has(token.id));
      })
      .catch(() => setIsWatchlisted(false));
  }, [wallet, token?.id]);

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
  const isCreator = wallet?.toLowerCase() === token.creatorAddress?.toLowerCase();

  async function handleFavoriteClick() {
    if (watchlistBusy) return;
    if (!hasWallet) {
      setSignInOpen(true);
      return;
    }
    await toggleWatchlist();
  }

  async function toggleWatchlist() {
    if (!wallet || !token?.id || watchlistBusy) return;
    setWatchlistBusy(true);
    const removing = isWatchlisted;
    setIsWatchlisted(!removing);
    try {
      const res = await fetch(apiUrl("/api/watchlist"), {
        method: removing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: token.id, walletAddress: wallet }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setIsWatchlisted(removing);
    } finally {
      setWatchlistBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <TokenBanner src={token.bannerUrl} alt={`${token.name} banner`} className="mb-6" priority />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <TokenLogo src={token.logoUrl} symbol={token.symbol} name={token.name} layout="responsive" priority />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {token.name}
            </h1>
            <div className="flex min-w-0 items-center gap-0.5">
              <span className="truncate font-mono text-xs text-muted-foreground" title={address}>
                {shortenAddress(address, 6)}
              </span>
              <AddressCopyButton value={address} className="h-6 w-6" />
            </div>
            {token.category && token.category !== "OTHER" && (
              <Badge variant="outline" className="mt-2">
                {TOKEN_CATEGORY_LABELS[token.category as TokenCategoryId]}
              </Badge>
            )}
            {token.creatorAddress && (
              <p className="mt-2 text-sm text-muted-foreground">
                Creator{" "}
                <CreatorProfileLink
                  walletAddress={token.creatorAddress}
                  username={token.creatorUsername}
                  showAvatar={false}
                  className="inline-flex"
                  labelClassName="text-primary hover:underline"
                />
              </p>
            )}
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
              <ArrowLeftRight className="h-4 w-4" /> Swap
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={isCreator ? liquidityUrl({ token: address }) : tokenLiquidityViewUrl(address)}>
              <Droplets className="h-4 w-4" /> {isCreator ? "Add Liquidity" : "View Liquidity"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`${OPN_EXPLORER_BASE.replace(/\/$/, "")}/address/${address}`} target="_blank" rel="noopener noreferrer">
              <FileCode className="h-4 w-4" /> View Contract
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={watchlistBusy}
            onClick={() => void handleFavoriteClick()}
            aria-label={
              !hasWallet
                ? "Sign in to add favorites"
                : isWatchlisted
                  ? "Remove from favorites"
                  : "Add to favorites"
            }
          >
            <Star className={cn("h-4 w-4", isWatchlisted && "fill-amber-400 text-amber-400")} />
            {isWatchlisted ? "Favorited" : "Favorite"}
          </Button>
          {isCreator && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={TOOLS_LOCK_PATH}>
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

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />

      {token.description && <p className="mt-6 text-muted-foreground">{token.description}</p>}

      <TokenAboutCard
        creatorFollowers={token.creatorFollowers ?? 0}
        website={token.website}
        telegram={token.telegram}
        twitter={token.twitter}
        createdAt={token.createdAt}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TrustScorePanel tokenAddress={address} />
        <TokenHealthPanel
          tokenAddress={address}
          featureFlags={featureFlags}
          buyTaxBps={token.buyTaxBps}
          sellTaxBps={token.sellTaxBps}
        />
      </div>

      <div className="mt-8">
        <TokenAnalyticsSection tokenAddress={address} />
      </div>

      <AnnouncementsSection tokenAddress={address} creatorAddress={token.creatorAddress} />

      <Card className="mt-8 overflow-hidden">
        <CardHeader>
          <CardTitle>Community sentiment</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <VoteButtons tokenId={token.id} walletAddress={wallet} />
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-4">
        {token.github && (
          <a href={token.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-iopn-600 hover:underline">
            GitHub <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
