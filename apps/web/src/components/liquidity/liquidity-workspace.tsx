"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";
import { MyLiquidityList } from "@/components/liquidity/my-liquidity-list";
import { LiquidityLockBurnEntryCard } from "@/components/liquidity/liquidity-lock-burn-entry-card";
import { DefiStatsOverview } from "@/components/defi/defi-stats-overview";
import { useAccount } from "wagmi";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";
import {
  formatBaseLpPositionLabel,
  formatTokenLpPositionLabel,
  summarizeLpDisplayParts,
} from "@/lib/liquidity/format-amount";
import { useMemo } from "react";

type LiquidityTab = "add" | "remove";

type LiquidityWorkspaceProps = {
  refreshSeq?: number;
  onLiquidityAdded?: () => void;
};

function LiquidityWorkspaceInner({ refreshSeq = 0, onLiquidityAdded }: LiquidityWorkspaceProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "remove" ? "remove" : "add";
  const { isConnected, address } = useAccount();
  const [tab, setTab] = useState<LiquidityTab>(initialTab);
  const { positions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: baseLoading } = useBasePoolLpPositions(address);

  useEffect(() => {
    setTab(searchParams.get("tab") === "remove" ? "remove" : "add");
  }, [searchParams]);

  const handleLiquidityAdded = useCallback(() => {
    onLiquidityAdded?.();
    setTab("remove");
  }, [onLiquidityAdded]);

  const personal = useMemo(() => {
    const tokenLp = positions.filter((p) => !p.pending && p.lpBalance > 0n);
    const baseLp = basePools.filter((p) => p.lpBalance > 0n);
    const lpDisplayParts = [
      ...tokenLp.map((p) =>
        formatTokenLpPositionLabel(p.lpBalance, p.lpDecimals, p.tokenSymbol, p.pairLabel)
      ),
      ...baseLp.map((p) => formatBaseLpPositionLabel(p.lpBalance, p.lpDecimals, p.pairLabel)),
    ];
    return {
      positionCount: tokenLp.length + baseLp.length,
      lpDisplayParts,
    };
  }, [positions, basePools]);

  return (
    <div className="space-y-4">
      <DefiStatsOverview
        showPersonal
        showPlatform={false}
        personalDescription="Your LP holdings across FansPump pools."
        personalStats={[
          {
            label: "Your LP positions",
            value: lpLoading || baseLoading ? "…" : String(personal.positionCount),
          },
          {
            label: "Your liquidity",
            value:
              lpLoading || baseLoading
                ? "…"
                : personal.positionCount === 0
                  ? "None yet"
                  : summarizeLpDisplayParts(personal.lpDisplayParts),
            hint: personal.positionCount > 0 ? "See activity below" : "Add a position above",
          },
        ]}
        personalLoading={lpLoading || baseLoading}
        isConnected={isConnected}
        connectMessage="Connect your wallet to see your LP holdings."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Liquidity</CardTitle>
          <CardDescription>Add or remove liquidity</CardDescription>
        </CardHeader>

        <div className="px-6">
          <div className="flex rounded-xl border border-border/60 bg-muted/20 p-1">
            {(
              [
                { id: "add" as const, label: "Add Liquidity" },
                { id: "remove" as const, label: "Remove Liquidity" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === item.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="pt-5">
          {tab === "add" ? (
            <AddLiquidityPanel variant="compact" onLiquidityAdded={handleLiquidityAdded} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Your LP positions are listed below. Open a position and choose{" "}
              <span className="font-medium text-foreground">Remove liquidity</span> to withdraw.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>My activities</CardTitle>
          <CardDescription>LP tokens you hold — project pairs and base pools.</CardDescription>
        </CardHeader>
        <CardContent>
          <MyLiquidityList refreshSeq={refreshSeq} showBasePools emphasizeLp />
        </CardContent>
      </Card>

      {isConnected && <LiquidityLockBurnEntryCard />}
    </div>
  );
}

export function LiquidityWorkspace(props: LiquidityWorkspaceProps) {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
      <LiquidityWorkspaceInner {...props} />
    </Suspense>
  );
}
