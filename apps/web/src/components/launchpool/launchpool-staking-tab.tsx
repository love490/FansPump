"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LaunchpoolList } from "@/components/launchpool/launchpool-list";

export function LaunchpoolStakingTab() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" /> Launchpool
          </CardTitle>
          <CardDescription>
            Stake OPN, USDT, USDC, or project tokens simultaneously to earn new project tokens for
            free. Your staked assets can be redeemed anytime. Rewards are credited to My Purse after
            each pool ends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/launchpad">Open Launchpad</Link>
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Featured pools</h2>
        <LaunchpoolList initialTab="ACTIVE" showTabs={false} limit={3} />
      </div>
    </div>
  );
}
