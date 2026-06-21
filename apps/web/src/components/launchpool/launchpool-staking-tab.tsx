"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { LaunchpoolList } from "@/components/launchpool/launchpool-list";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StakingActivityList, type StakingActivityRow } from "@/components/staking/staking-activity-list";

type LaunchpoolStakingTabProps = {
  activityRows: StakingActivityRow[];
};

export function LaunchpoolStakingTab({ activityRows }: LaunchpoolStakingTabProps) {
  const { isSignedIn } = useAuth();
  const { isConnected } = useAccount();
  const [signInOpen, setSignInOpen] = useState(false);
  const canViewActivity = isSignedIn || isConnected;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!canViewActivity ? (
            <>
              <Button type="button" onClick={() => setSignInOpen(true)}>
                Sign in
              </Button>
              <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
            </>
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
