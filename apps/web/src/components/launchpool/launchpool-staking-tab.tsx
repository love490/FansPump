"use client";

import { LaunchpoolList } from "@/components/launchpool/launchpool-list";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StakingActivityList, type StakingActivityRow } from "@/components/staking/staking-activity-list";
import { useRequireSignIn } from "@/hooks/useRequireSignIn";

type LaunchpoolStakingTabProps = {
  activityRows: StakingActivityRow[];
};

export function LaunchpoolStakingTab({ activityRows }: LaunchpoolStakingTabProps) {
  const { canParticipate, signInOpen, setSignInOpen } = useRequireSignIn();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StakingActivityList
            rows={canParticipate ? activityRows : []}
            emptyMessage={
              canParticipate
                ? "No Launchpool stakes yet. Stake in an open pool below."
                : "Sign in to view your Launchpool stakes."
            }
          />
          {!canParticipate && (
            <Button type="button" onClick={() => setSignInOpen(true)}>
              Sign in
            </Button>
          )}
          <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Launchpools</h2>
        <LaunchpoolList initialTab="ACTIVE" />
      </div>
    </div>
  );
}
