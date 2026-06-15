"use client";

import { Rocket } from "lucide-react";
import { LaunchpoolList } from "@/components/launchpool/launchpool-list";

export default function LaunchpadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Rocket className="h-6 w-6 text-primary" /> Launchpad
        </h1>
        <p className="mt-1 text-muted-foreground">
          Stake multiple assets to earn project tokens for free. Unstake anytime. Claim rewards from
          your My Purse after each pool distributes.
        </p>
      </header>

      <LaunchpoolList initialTab="ACTIVE" />
    </div>
  );
}
