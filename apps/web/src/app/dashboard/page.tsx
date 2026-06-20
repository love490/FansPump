"use client";

import { Suspense, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardBalancePanel } from "@/components/dashboard/dashboard-balance-panel";
import { DashboardProfileLink } from "@/components/dashboard/dashboard-profile-link";
import { DashboardTabNav, type DashboardTabId } from "@/components/dashboard/dashboard-tab-nav";
import { DashboardMyTokensTab } from "@/components/dashboard/dashboard-my-tokens-tab";
import { DashboardDefiTab } from "@/components/dashboard/dashboard-defi-tab";
import { DashboardEarningsTab } from "@/components/dashboard/dashboard-earnings-tab";
import { DashboardActivitiesTab } from "@/components/dashboard/dashboard-activities-tab";
import { ProfileVerificationSection } from "@/components/verification/profile-verification-section";
import { CreatorVerificationCard } from "@/components/verification/creator-verification-card";
import { SignInButton } from "@/components/auth/sign-in-button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { formatCreatorDisplay } from "@/lib/username";
import { shortenAddress } from "@/lib/utils";

export default function DashboardPage() {
  const { walletAddress, hasWallet, isSignedIn, linkedWalletOnly, isWalletConnected } = useActiveWallet();
  const { openConnectModal } = useConnectModal();
  const { profile } = useUserProfile(walletAddress);
  const [activeTab, setActiveTab] = useState<DashboardTabId>("tokens");
  const displayName = walletAddress
    ? formatCreatorDisplay(profile?.username, walletAddress, shortenAddress)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        {(hasWallet || isSignedIn) && <DashboardProfileLink className="sm:order-first" />}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayName ??
              (isSignedIn
                ? "Link or connect your wallet to view your portfolio."
                : "Sign in and connect your wallet to view your portfolio.")}
          </p>
        </div>
      </header>

      {hasWallet ? (
        <>
          {isWalletConnected ? (
            <CreatorVerificationCard />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  Verify
                </CardTitle>
                <CardDescription>
                  Connect your wallet to sign and receive a verified creator badge.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={() => openConnectModal?.()}>
                  Connect wallet to verify
                </Button>
              </CardContent>
            </Card>
          )}
          <Suspense fallback={null}>
            <ProfileVerificationSection />
          </Suspense>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Verify
            </CardTitle>
            <CardDescription>
              Sign in and connect your wallet to verify your creator profile and earn a trusted badge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSignedIn ? (
              <Button type="button" onClick={() => openConnectModal?.()}>
                Connect wallet to verify
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sign in below to get started with verification.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!hasWallet ? (
        <Card className="relative z-10 overflow-hidden bg-card shadow-sm">
          <CardHeader>
            <CardTitle>{isSignedIn ? "Connect your wallet" : "Sign in to continue"}</CardTitle>
            {isSignedIn && (
              <CardDescription>
                Connect the wallet you use on FansPump to load balances, DeFi positions, and activity.{" "}
                <a href="/settings#linked-accounts" className="font-medium text-primary hover:underline">
                  Link accounts
                </a>{" "}
                in settings.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="relative isolate">
            {isSignedIn ? (
              <Button type="button" onClick={() => openConnectModal?.()}>
                Connect wallet
              </Button>
            ) : (
              <div className="relative z-10">
                <SignInButton />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {linkedWalletOnly && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Showing data for your linked wallet.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => openConnectModal?.()}
              >
                Connect wallet
              </button>{" "}
              for live on-chain balances and transactions.
            </div>
          )}
          <DashboardBalancePanel />
          <DashboardTabNav active={activeTab} onChange={setActiveTab} />
          <Card>
            <CardContent className="pt-6">
              {activeTab === "tokens" && <DashboardMyTokensTab />}
              {activeTab === "defi" && <DashboardDefiTab />}
              {activeTab === "earnings" && <DashboardEarningsTab />}
              {activeTab === "activities" && <DashboardActivitiesTab />}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
