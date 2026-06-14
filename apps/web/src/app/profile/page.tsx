"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileEditor } from "@/components/profile/profile-editor";

export default function ProfilePage() {
  const { isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-xl space-y-6 py-2 sm:py-4">
      <header className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
          <Link href="/dashboard" aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Upload a photo, set your username, and manage how you appear on FansPump.
          </p>
        </div>
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
