"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardProfileLink } from "@/components/dashboard/dashboard-profile-link";
import { DashboardTabNav, type DashboardTabId } from "@/components/dashboard/dashboard-tab-nav";
import { DashboardMyTokensTab } from "@/components/dashboard/dashboard-my-tokens-tab";
import { DashboardDefiTab } from "@/components/dashboard/dashboard-defi-tab";
import { DashboardEarningsTab } from "@/components/dashboard/dashboard-earnings-tab";
import { DashboardActivitiesTab } from "@/components/dashboard/dashboard-activities-tab";
import { shortenAddress } from "@/lib/utils";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<DashboardTabId>("tokens");

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-4">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <DashboardProfileLink className="sm:order-first" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isConnected && address
              ? shortenAddress(address, 6)
              : "Connect your wallet to view your portfolio."}
          </p>
        </div>
      </header>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect your wallet</CardTitle>
            <CardDescription>Connect wallet to view tokens, DeFi, earnings, and activity.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
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
