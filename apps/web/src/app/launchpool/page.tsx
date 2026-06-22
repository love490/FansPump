"use client";

import { Megaphone } from "lucide-react";
import { LaunchpoolStakingTab } from "@/components/launchpool/launchpool-staking-tab";

export default function LaunchpoolPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Megaphone className="h-6 w-6 text-primary" /> Launchpool
        </h1>
        <p className="mt-1 text-muted-foreground">
          Stake OPN, USDT, USDC, or project tokens to earn new project tokens for free. Unstake anytime.
          Rewards are credited to My Purse after each pool ends.
        </p>
      </header>

      <LaunchpoolStakingTab />
    </div>
  );
}
