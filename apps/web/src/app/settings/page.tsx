"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { Shield, ExternalLink } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

export default function SettingsPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="mx-auto max-w-xl space-y-6 py-2 sm:py-4">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Account preferences and platform options.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wallet</CardTitle>
          <CardDescription>
            {isConnected && address
              ? `Connected: ${shortenAddress(address, 6)}`
              : "Connect wallet to have access to your dashboard."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Display name and photo shown across FansPump.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">Open profile</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ProfileEditor showSettingsLink={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Switch between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Creator</CardTitle>
          <CardDescription>Verify your deployer wallet for a trusted creator badge.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/verify">
              <Shield className="h-4 w-4" />
              Creator verification
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legal & docs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Link href="/privacy" className="inline-flex items-center gap-1 text-primary hover:underline">
            Privacy Policy <ExternalLink className="h-3 w-3" />
          </Link>
          <Link href="/terms" className="inline-flex items-center gap-1 text-primary hover:underline">
            Terms of Service <ExternalLink className="h-3 w-3" />
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-1 text-primary hover:underline">
            Documentation <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
