"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Compass, Flame } from "lucide-react";
import { TokenGridCarousel } from "@/components/tokens/token-grid-carousel";
import { DashboardProfilePanel } from "@/components/dashboard/dashboard-profile-panel";
import { DashboardStatsPanel } from "@/components/dashboard/dashboard-stats-panel";
import { DashboardActivityFeed } from "@/components/dashboard/dashboard-activity-feed";
import { CreatorBountySection } from "@/components/bounties/creator-bounty-section";
import { fetchDiscoverTokens, tokenQueryKeys } from "@/lib/tokens-api";
import { fetchMyTokens } from "@/lib/token-register";
import { getActiveChainId } from "@/lib/chain-config/opn";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const chainId = getActiveChainId();

  const { data: myTokens = [] } = useQuery({
    queryKey: tokenQueryKeys.myTokens(address ?? "", chainId),
    queryFn: () => fetchMyTokens(address!),
    enabled: Boolean(isConnected && address),
    staleTime: 30_000,
  });

  const { data: trending = [], isLoading: loadingTrending } = useQuery({
    queryKey: tokenQueryKeys.discover("trending", chainId),
    queryFn: () => fetchDiscoverTokens("trending", 12),
    staleTime: 15_000,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2 sm:py-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Track stakes, liquidity, and quests across FansPump and OPN Network.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/discover?section=trending">
            Explore Projects
            <Compass className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect your wallet</CardTitle>
            <CardDescription>Connect wallet to view your OPN Network activity.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <DashboardStatsPanel />
          <DashboardActivityFeed />
          <DashboardProfilePanel />

          <CreatorBountySection
            creatorWallet={address!.toLowerCase()}
            creatorTokens={myTokens.map((t) => ({
              contractAddress: t.contractAddress,
              symbol: t.symbol,
              name: t.name,
            }))}
          />
        </>
      )}

      <TokenGridCarousel
        title="Trending"
        icon={<Flame className="h-6 w-6 text-orange-500" />}
        description="Hot projects on FansPump right now."
        tokens={trending}
        isLoading={loadingTrending}
        viewAllHref="/discover?section=trending"
        variant="trending"
        fetchLimit={12}
        emptyMessage="No trending tokens yet."
      />

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">Explore all projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter by newly created, verified, category, and more from Explore.
            </p>
          </div>
          <Button asChild>
            <Link href="/discover?section=trending">
              Open Explore
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
