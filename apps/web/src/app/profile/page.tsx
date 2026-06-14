"use client";

import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditor } from "@/components/profile/profile-editor";

export default function ProfilePage() {
  const { isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a photo, set your username, and manage how you appear on FansPump.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
          <CardDescription>
            {isConnected
              ? "This name and photo appear on tokens you create and across the platform."
              : "Connect your wallet to edit your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileEditor showSettingsLink />
        </CardContent>
      </Card>
    </div>
  );
}
