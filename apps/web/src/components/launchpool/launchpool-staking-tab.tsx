"use client";

import { LaunchpoolList } from "@/components/launchpool/launchpool-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StakingActivityList, type StakingActivityRow } from "@/components/staking/staking-activity-list";

type LaunchpoolStakingTabProps = {
  activityRows: StakingActivityRow[];
  isConnected: boolean;
};

export function LaunchpoolStakingTab({ activityRows, isConnected }: LaunchpoolStakingTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your activity</CardTitle>
          <CardDescription>
            Every token you have staked in Launchpool campaigns (OPN, USDT, USDC, project tokens).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="text-sm text-muted-foreground">Connect wallet to view Launchpool stakes.</p>
          ) : (
            <StakingActivityList
              rows={activityRows}
              emptyMessage="No Launchpool stakes yet. Stake in an open pool below."
            />
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Launchpools</h2>
        <LaunchpoolList initialTab="ACTIVE" />
      </div>
    </div>
  );
}
