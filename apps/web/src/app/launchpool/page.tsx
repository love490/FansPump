"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Megaphone } from "lucide-react";
import { LaunchpoolStakingTab } from "@/components/launchpool/launchpool-staking-tab";
import { launchpoolStakeToActivityRow } from "@/components/staking/staking-activity-list";

type LaunchpoolStakeRow = {
  id: string;
  launchpoolTitle: string;
  assetSymbol: string;
  amount: string;
  stakedAt: string;
};

export default function LaunchpoolPage() {
  const { address } = useAccount();
  const [launchpoolStakes, setLaunchpoolStakes] = useState<LaunchpoolStakeRow[]>([]);

  useEffect(() => {
    if (!address) {
      setLaunchpoolStakes([]);
      return;
    }
    fetch(apiUrl(`/api/user/dashboard?wallet=${address.toLowerCase()}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLaunchpoolStakes(d?.launchpoolStakes ?? []))
      .catch(() => setLaunchpoolStakes([]));
  }, [address]);

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

      <LaunchpoolStakingTab activityRows={launchpoolStakes.map(launchpoolStakeToActivityRow)} />
    </div>
  );
}
