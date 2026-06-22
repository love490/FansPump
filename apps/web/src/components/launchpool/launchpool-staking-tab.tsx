"use client";

import { LaunchpoolList } from "@/components/launchpool/launchpool-list";

export function LaunchpoolStakingTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Launchpools</h2>
        <LaunchpoolList initialTab="ONGOING" />
      </div>
    </div>
  );
}
