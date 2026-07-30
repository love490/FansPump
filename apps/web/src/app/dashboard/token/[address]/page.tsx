"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { useBalance, usePublicClient, useReadContract } from "wagmi";
import {
  ArrowLeft,
  ArrowLeftRight,
  Droplets,
  ExternalLink,
  FileCode,
  Share2,
  ShoppingCart,
  Star,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { AnnouncementsSection } from "@/components/token/announcements-section";
import { TokenAnalyticsSection } from "@/components/token/token-analytics-section";
import { TokenHealthPanel, TrustScorePanel } from "@/components/trust/TrustScorePanel";
import { TokenLogo } from "@/components/tokens/token-logo";
import { CreatorProfileLink } from "@/components/profile/creator-profile-link";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendTokenDialog } from "@/components/dashboard/send-token-dialog";
import { ReceiveTokenDialog } from "@/components/dashboard/receive-token-dialog";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useWalletTokenActivity } from "@/hooks/dashboard/useWalletTokenActivity";
import { apiUrl } from "@/lib/api";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { explorerTxUrl, explorerAddressUrl } from "@/lib/explorer";
import { fetchTokenUsdValue, fetchOpnUsdRate, DEFAULT_OPN_USD } from "@/lib/dashboard/token-quotes";
import { formatBalanceTotal } from "@/lib/dashboard/wallet-balance";
import { liquidityUrl, tokenLiquidityViewUrl } from "@/lib/navigation/liquidity-routes";
import { erc20Abi } from "@/lib/swap/abis";
import { getRouterAddress } from "@/lib/swap/routerAdapter";
import { formatMarketPrice } from "@/lib/tokens/market-metrics";
import { isNativeOpnToken, NATIVE_OPN_ID, swapPageHref } from "@/lib/tokens/token-route";
import { cn, shortenAddress } from "@/lib/utils";

type TokenDetail = {
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
  description?: string | null;
  website?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  createdAt?: string | null;
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
  isNative?: boolean;
  isExternal?: boolean;
  isIndexed?: boolean;
  contractAddress?: string;
  marketCap?: number | null;
  holderCount?: number | null;
  trustScore?: number | null;
  decimals?: number;
};

const ACTIVITY_LABELS: Record<string, string> = {
  swap: "Swap",
  lock: "Lock",
  burn: "Burn",
  token: "Created",
};

export default function WalletTokenPage() {
  const params = useParams();
  const addressParam = (params.address as string) ?? "";
  const { walletAddress, hasWallet, isWalletConnected } = useActiveWallet();
  const client = usePublicClient();

  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [usdValue, setUsdValue] = useState(0);
  const [unitPriceUsd, setUnitPriceUsd] = useState(0);
  const [opnRate, setOpnRate] = useState(DEFAULT_OPN_USD);

  const isNative = isNativeOpnToken(addressParam, token?.symbol);
  const contractAddress = token?.contractAddress || (isNative ? "" : addressParam.toLowerCase());
  const explorerAddress = isNative ? null : contractAddress || addressParam.toLowerCase();

  const { trustScore: trustView, health } = useTrustScore(explorerAddress ?? undefined);
  const { activities, loading: activityLoading } = useWalletTokenActivity(
    walletAddress,
    isNative ? undefined : explorerAddress ?? undefined
  );

  const decimals = token?.decimals ?? (isNative ? 18 : 18);

  const { data: nativeBalance } = useBalance({
    address: walletAddress,
    query: { enabled: Boolean(walletAddress) && isNative },
  });

  const { data: erc20Balance } = useReadContract({
    address: !isNative && explorerAddress?.startsWith("0x") ? (explorerAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: Boolean(walletAddress) && !isNative && Boolean(explorerAddress) },
  });

  const { data: onChainDecimals } = useReadContract({
    address: !isNative && explorerAddress?.startsWith("0x") ? (explorerAddress as Address) : undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !isNative && Boolean(explorerAddress) },
  });

  const tokenDecimals =
    typeof onChainDecimals === "number"
      ? onChainDecimals
      : typeof onChainDecimals === "bigint"
        ? Number(onChainDecimals)
        : decimals;

  const balanceRaw = isNative
    ? (nativeBalance?.value ?? 0n)
    : typeof erc20Balance === "bigint"
      ? erc20Balance
      : 0n;

  const balanceFloat = useMemo(() => {
    try {
      return Number(formatUnits(balanceRaw, isNative ? (nativeBalance?.decimals ?? 18) : tokenDecimals));
    } catch {
      return 0;
    }
  }, [balanceRaw, isNative, nativeBalance?.decimals, tokenDecimals]);

  useEffect(() => {
    if (!addressParam) return;
    setLoading(true);
    setLoadError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    fetch(apiUrl(`/api/tokens/${addressParam}`), { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : `Failed to load token (${r.status})`
          );
        }
        if (!data?.token) throw new Error("Token not found");
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
  }, [addressParam]);

  useEffect(() => {
    if (!walletAddress || !token?.id) {
      setIsWatchlisted(false);
      return;
    }
    fetch(apiUrl(`/api/watchlist?wallet=${walletAddress}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const ids = new Set((data?.tokens ?? []).map((t: { id: string }) => t.id));
        setIsWatchlisted(ids.has(token.id));
      })
      .catch(() => setIsWatchlisted(false));
  }, [walletAddress, token?.id]);

  useEffect(() => {
    if (!client || balanceRaw <= 0n) {
      setUsdValue(0);
      setUnitPriceUsd(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const rate = await fetchOpnUsdRate(client);
      if (!cancelled) setOpnRate(rate > 0 ? rate : DEFAULT_OPN_USD);

      if (isNative) {
        const amount = Number(formatUnits(balanceRaw, nativeBalance?.decimals ?? 18));
        const usd = amount * (rate > 0 ? rate : DEFAULT_OPN_USD);
        if (!cancelled) {
          setUsdValue(usd);
          setUnitPriceUsd(rate > 0 ? rate : DEFAULT_OPN_USD);
        }
        return;
      }

      const router = getRouterAddress("primary");
      const usdt = opnChainConfig.contracts.usdt;
      const wopn = opnChainConfig.contracts.wopn;
      if (!router || !usdt || !explorerAddress) {
        if (!cancelled) {
          setUsdValue(0);
          setUnitPriceUsd(0);
        }
        return;
      }

      const usd = await fetchTokenUsdValue(
        client,
        explorerAddress as Address,
        balanceRaw,
        wopn,
        usdt,
        router
      );
      if (cancelled) return;
      setUsdValue(usd);
      const amount = Number(formatUnits(balanceRaw, tokenDecimals));
      setUnitPriceUsd(amount > 0 ? usd / amount : 0);
    })().catch(() => {
      if (!cancelled) {
        setUsdValue(0);
        setUnitPriceUsd(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    client,
    balanceRaw,
    isNative,
    nativeBalance?.decimals,
    explorerAddress,
    tokenDecimals,
  ]);

  const swapTarget = swapPageHref(contractAddress || NATIVE_OPN_ID, token?.symbol);
  const liquidityKnownEmpty =
    !isNative && health != null && Number(health.liquidity ?? 0) <= 0;
  const hasLiquidity = isNative || !liquidityKnownEmpty;

  const portfolioShareHint =
    usdValue > 0
      ? `${formatBalanceTotal(usdValue, "USD")} · ${formatMarketPrice(unitPriceUsd)} / ${token?.symbol ?? ""}`
      : "Value unavailable";

  const toggleWatchlist = useCallback(async () => {
    if (!walletAddress || !token?.id || watchlistBusy) return;
    setWatchlistBusy(true);
    const removing = isWatchlisted;
    setIsWatchlisted(!removing);
    try {
      const res = await fetch(apiUrl("/api/watchlist"), {
        method: removing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: token.id, walletAddress }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setIsWatchlisted(removing);
    } finally {
      setWatchlistBusy(false);
    }
  }, [walletAddress, token?.id, watchlistBusy, isWatchlisted]);

  async function shareToken() {
    if (!token) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/token/${isNative ? NATIVE_OPN_ID : explorerAddress}`
        : "";
    const text = `${token.name} (${token.symbol}) on FansPump`;
    try {
      if (navigator.share) {
        await navigator.share({ title: token.name, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">
        Loading wallet asset…
      </div>
    );
  }

  if (loadError || !token) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-20 text-center">
        <p className="text-red-600 dark:text-red-400">{loadError ?? "Token not found"}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Wallet</Link>
        </Button>
      </div>
    );
  }

  const isIndexed = token.isIndexed ?? !token.isExternal;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const hasCreator =
    Boolean(token.creatorAddress) &&
    token.creatorAddress.toLowerCase() !== zeroAddress &&
    isIndexed;
  const sellDisabled = balanceRaw <= 0n;
  const trustScore = trustView?.score ?? token.trustScore ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Wallet
          </Link>
        </Button>
        <Badge variant="outline" className="text-xs">
          {opnChainConfig.name}
        </Badge>
      </div>

      <header className="flex flex-wrap items-start gap-4">
        <TokenLogo
          src={token.logoUrl}
          symbol={token.symbol}
          name={token.name}
          layout="fixed"
          size={56}
          priority
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{token.name}</h1>
            <Badge variant="secondary">{token.symbol}</Badge>
          </div>
          {isNative ? (
            <p className="mt-1 text-sm text-muted-foreground">Native gas token · OPN Chain</p>
          ) : (
            <div className="mt-1 flex items-center gap-1.5">
              <p className="font-mono text-sm text-muted-foreground">
                {shortenAddress(explorerAddress ?? addressParam, 6)}
              </p>
              {explorerAddress && <AddressCopyButton value={explorerAddress} />}
            </div>
          )}
          {hasCreator && (
            <div className="mt-2">
              <CreatorProfileLink
                walletAddress={token.creatorAddress}
                username={token.creatorUsername}
                showAvatar
              />
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {token.liquidityLocked && <Badge variant="verified">Liquidity locked</Badge>}
            {token.ownershipRenounced && <Badge variant="outline">Ownership renounced</Badge>}
            {isIndexed && <Badge variant="outline">Indexed</Badge>}
            {typeof trustScore === "number" && (
              <Badge variant="secondary">Trust {Math.round(trustScore)}</Badge>
            )}
          </div>
        </div>
      </header>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your balance
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {balanceFloat.toLocaleString(undefined, { maximumFractionDigits: 6 })} {token.symbol}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Portfolio value
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {usdValue > 0 ? formatBalanceTotal(usdValue, "USD") : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{portfolioShareHint}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Spot price
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {unitPriceUsd > 0 ? formatMarketPrice(unitPriceUsd) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ≈ {(unitPriceUsd > 0 && opnRate > 0 ? unitPriceUsd / opnRate : 0).toLocaleString(
                undefined,
                { maximumFractionDigits: 6 }
              )}{" "}
              OPN
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Button asChild size="lg" className="h-12" disabled={!hasLiquidity}>
            <Link
              href={hasLiquidity ? `${swapTarget}?mode=buy` : "#"}
              aria-disabled={!hasLiquidity}
              className={cn(!hasLiquidity && "pointer-events-none opacity-50")}
              onClick={(e) => {
                if (!hasLiquidity) e.preventDefault();
              }}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Buy
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12"
            disabled={sellDisabled}
          >
            <Link
              href={sellDisabled ? "#" : `${swapTarget}?mode=sell`}
              aria-disabled={sellDisabled}
              className={cn(sellDisabled && "pointer-events-none opacity-50")}
              onClick={(e) => {
                if (sellDisabled) e.preventDefault();
              }}
            >
              <TrendingDown className="mr-1.5 h-4 w-4" />
              Sell
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12">
            <Link href={swapTarget}>
              <ArrowLeftRight className="mr-1.5 h-4 w-4" />
              Swap
            </Link>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12"
            disabled={!isWalletConnected || balanceRaw <= 0n}
            onClick={() => setSendOpen(true)}
          >
            Send
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12"
            disabled={!hasWallet}
            onClick={() => setReceiveOpen(true)}
          >
            Receive
          </Button>
        </div>
        {!hasLiquidity && (
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            This token is currently not tradable — no liquidity detected.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!isNative && explorerAddress && (
            <>
              <Button asChild variant="outline" size="sm">
                <a
                  href={explorerAddressUrl(explorerAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileCode className="mr-1.5 h-4 w-4" />
                  View contract
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={tokenLiquidityViewUrl(explorerAddress)}>
                  <Droplets className="mr-1.5 h-4 w-4" />
                  View liquidity
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={liquidityUrl({ token: explorerAddress })}>Add liquidity</Link>
              </Button>
            </>
          )}
          {isIndexed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={watchlistBusy}
              onClick={() => {
                if (!hasWallet) {
                  setSignInOpen(true);
                  return;
                }
                void toggleWatchlist();
              }}
            >
              <Star className={cn("mr-1.5 h-4 w-4", isWatchlisted && "fill-amber-400 text-amber-400")} />
              {isWatchlisted ? "Favorited" : "Favorite"}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => void shareToken()}>
            <Share2 className="mr-1.5 h-4 w-4" />
            Share
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={isNative ? `/token/${NATIVE_OPN_ID}` : `/token/${explorerAddress}`}>
              <Wallet className="mr-1.5 h-4 w-4" />
              Public page
            </Link>
          </Button>
        </div>
      </section>

      {!isNative && explorerAddress && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TrustScorePanel tokenAddress={explorerAddress} />
          <TokenHealthPanel
            tokenAddress={explorerAddress}
            featureFlags={Number(token.featureFlags)}
            buyTaxBps={token.buyTaxBps}
            sellTaxBps={token.sellTaxBps}
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Token information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoRow label="Network" value={opnChainConfig.name} />
            <InfoRow
              label="Launch date"
              value={
                token.createdAt
                  ? new Date(token.createdAt).toLocaleDateString()
                  : "—"
              }
            />
            <InfoRow
              label="Liquidity lock"
              value={token.liquidityLocked ? "Locked" : "Not locked"}
            />
            <InfoRow
              label="Ownership"
              value={token.ownershipRenounced ? "Renounced" : "Creator-held"}
            />
            <InfoRow
              label="Holders"
              value={
                typeof token.holderCount === "number"
                  ? token.holderCount.toLocaleString()
                  : "—"
              }
            />
            <InfoRow
              label="Market cap"
              value={
                typeof token.marketCap === "number" && token.marketCap > 0
                  ? formatMarketPrice(token.marketCap)
                  : "—"
              }
            />
            {hasCreator && (
              <InfoRow label="Creator" value={shortenAddress(token.creatorAddress, 6)} />
            )}
            <InfoRow
              label="Contract verification"
              value={isIndexed ? "Indexed on FansPump" : "External / unverified listing"}
            />
          </dl>
        </CardContent>
      </Card>

      {!isNative && explorerAddress && <TokenAnalyticsSection tokenAddress={explorerAddress} />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your position</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoRow
              label="Balance owned"
              value={`${balanceFloat.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${token.symbol}`}
            />
            <InfoRow
              label="Current value"
              value={usdValue > 0 ? formatBalanceTotal(usdValue, "USD") : "—"}
            />
            <InfoRow
              label="Average buy price"
              value="—"
              hint="Not tracked yet for this wallet"
            />
            <InfoRow
              label="Profit / loss"
              value="—"
              hint="Requires buy-price history"
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {!walletAddress ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Connect a wallet to see this token&apos;s history for your address.
            </p>
          ) : activityLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity…</p>
          ) : activities.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No swaps, locks, or burns recorded for this token in your wallet yet.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {activities.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {ACTIVITY_LABELS[item.kind] ?? item.kind}
                      </Badge>
                      <p className="font-medium">{item.title}</p>
                    </div>
                    {item.amount && (
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                        {item.amount}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.occurredAt).toLocaleString()}
                    </p>
                  </div>
                  {item.txHash && (
                    <a
                      href={explorerTxUrl(item.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      View on explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {hasCreator && explorerAddress && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Community</h2>
          <AnnouncementsSection
            tokenAddress={explorerAddress}
            creatorAddress={token.creatorAddress}
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/earn">Community quests</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/launchpool">Related LaunchPools</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/creator/${token.creatorAddress.toLowerCase()}`}>
                Creator updates
              </Link>
            </Button>
          </div>
        </section>
      )}

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
      <SendTokenDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        walletAddress={walletAddress}
        tokenAddress={isNative ? null : explorerAddress}
        symbol={token.symbol}
        decimals={isNative ? (nativeBalance?.decimals ?? 18) : tokenDecimals}
        balance={balanceRaw}
        isNative={isNative}
      />
      <ReceiveTokenDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        walletAddress={walletAddress}
        symbol={token.symbol}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
