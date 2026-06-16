"use client";

import { useState } from "react";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardBalancePanel } from "@/components/dashboard/dashboard-balance-panel";
import { DashboardProfileLink } from "@/components/dashboard/dashboard-profile-link";
import { DashboardTabNav, type DashboardTabId } from "@/components/dashboard/dashboard-tab-nav";
import { DashboardMyTokensTab } from "@/components/dashboard/dashboard-my-tokens-tab";
import { DashboardDefiTab } from "@/components/dashboard/dashboard-defi-tab";
import { DashboardEarningsTab } from "@/components/dashboard/dashboard-earnings-tab";
import { DashboardActivitiesTab } from "@/components/dashboard/dashboard-activities-tab";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { formatCreatorDisplay } from "@/lib/username";
import { shortenAddress } from "@/lib/utils";

export default function DashboardPage() {
  const { walletAddress, hasWallet, isSignedIn, linkedWalletOnly } = useActiveWallet();
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

      {!hasWallet ? (
        <Card>
          <CardHeader>
            <CardTitle>{isSignedIn ? "Connect your wallet" : "Sign in to continue"}</CardTitle>
            <CardDescription>
              {isSignedIn
                ? "Connect the wallet you use on FansPump to load balances, DeFi positions, and activity."
                : "Sign in with email, social, or wallet to view tokens, DeFi, earnings, and activity."}
            </CardDescription>
          </CardHeader>
          {isSignedIn && (
            <CardContent>
              <Button type="button" onClick={() => openConnectModal?.()}>
                Connect wallet
              </Button>
            </CardContent>
          )}
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
