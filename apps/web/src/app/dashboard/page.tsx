"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Coins, Compass, Shield } from "lucide-react";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [myTokensCount, setMyTokensCount] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/watchlist?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setWatchlistCount(d.tokens?.length ?? 0));
    fetch(`/api/tokens?creator=${address}&limit=100`)
      .then((r) => r.json())
      .then((d) => setMyTokensCount(d.tokens?.length ?? 0));
    fetch(`/api/verify?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setVerified(!!d.verified))
      .catch(() => setVerified(false));
  }, [address]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Your FansPump activity at a glance.</p>
      </header>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect your wallet</CardTitle>
            <CardDescription>Connect wallet to have access to your dashboard.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>My tokens</CardDescription>
                <CardTitle className="text-3xl">{myTokensCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Watchlist</CardDescription>
                <CardTitle className="text-3xl">{watchlistCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Creator status</CardDescription>
                <CardTitle className="text-lg">{verified ? "Verified" : "Not verified"}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-auto justify-start gap-3 py-4">
              <Link href="/my-tokens">
                <Coins className="h-5 w-5" />
                <span className="text-left">
                  <span className="block font-semibold">My Tokens</span>
                  <span className="text-xs font-normal text-muted-foreground">Projects you launched</span>
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start gap-3 py-4">
              <Link href="/watchlist">
                <Bookmark className="h-5 w-5" />
                <span className="text-left">
                  <span className="block font-semibold">Watchlist</span>
                  <span className="text-xs font-normal text-muted-foreground">Tokens you track</span>
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start gap-3 py-4">
              <Link href="/discover">
                <Compass className="h-5 w-5" />
                <span className="text-left">
                  <span className="block font-semibold">Explore</span>
                  <span className="text-xs font-normal text-muted-foreground">Discover projects</span>
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start gap-3 py-4">
              <Link href="/verify">
                <Shield className="h-5 w-5" />
                <span className="text-left">
                  <span className="block font-semibold">Creator verification</span>
                  <span className="text-xs font-normal text-muted-foreground">Get your verified badge</span>
                </span>
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
