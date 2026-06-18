"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";
import { MyLiquidityList } from "@/components/liquidity/my-liquidity-list";
import { LiquidityLockBurnEntryCard } from "@/components/liquidity/liquidity-lock-burn-entry-card";
import { StatGrid } from "@/components/defi/defi-stats-overview";
import { useAccount } from "wagmi";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";

type LiquidityTab = "add" | "remove";

type LiquidityWorkspaceProps = {
  refreshSeq?: number;
  onLiquidityAdded?: () => void;
};

function TabFromUrl({ onTab }: { onTab: (tab: LiquidityTab) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    onTab(searchParams.get("tab") === "remove" ? "remove" : "add");
  }, [searchParams, onTab]);

  return null;
}

function RemoveLiquidityTab({ refreshSeq }: { refreshSeq: number }) {
  const { isConnected, address } = useAccount();
  const { positions, loading: lpLoading } = useMyLiquidityPositions(address);
  const { positions: basePools, loading: baseLoading } = useBasePoolLpPositions(address);

  const personal = useMemo(() => {
    const tokenLp = positions.filter((p) => !p.pending && p.lpBalance > 0n);
    const baseLp = basePools.filter((p) => p.lpBalance > 0n);
    return { positionCount: tokenLp.length + baseLp.length };
  }, [positions, basePools]);

  const statsLoading = lpLoading || baseLoading;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">My activity</h3>
          <p className="text-sm text-muted-foreground">Your LP holdings across FansPump pools.</p>
        </div>

        {!isConnected ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Connect your wallet to see your LP activity.
          </p>
        ) : (
          <StatGrid
            stats={[
              {
                label: "Your LP positions",
                value: statsLoading ? "…" : String(personal.positionCount),
                hint:
                  personal.positionCount > 0
                    ? "See active positions below"
                    : "Add liquidity to get started",
              },
            ]}
            loading={statsLoading}
          />
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <div>
          <h3 className="text-base font-semibold">Active positions</h3>
          <p className="text-sm text-muted-foreground">
            LP tokens you hold — project pairs and base pools.
          </p>
        </div>
        <MyLiquidityList refreshSeq={refreshSeq} showBasePools emphasizeLp />
      </div>

      {isConnected && <LiquidityLockBurnEntryCard />}
    </div>
  );
}

export function LiquidityWorkspace({ refreshSeq = 0, onLiquidityAdded }: LiquidityWorkspaceProps) {
  const [tab, setTab] = useState<LiquidityTab>("add");
  const [removeMounted, setRemoveMounted] = useState(false);

  const syncTabFromUrl = useCallback((next: LiquidityTab) => {
    setTab(next);
    if (next === "remove") setRemoveMounted(true);
  }, []);

  useEffect(() => {
    if (tab === "remove") setRemoveMounted(true);
  }, [tab]);

  const handleLiquidityAdded = useCallback(() => {
    onLiquidityAdded?.();
    setRemoveMounted(true);
    setTab("remove");
  }, [onLiquidityAdded]);

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <TabFromUrl onTab={syncTabFromUrl} />
      </Suspense>

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
          <div className={cn(tab !== "add" && "hidden")} aria-hidden={tab !== "add"}>
            <AddLiquidityPanel variant="compact" onLiquidityAdded={handleLiquidityAdded} />
          </div>

          {removeMounted && (
            <div className={cn(tab !== "remove" && "hidden")} aria-hidden={tab !== "remove"}>
              <RemoveLiquidityTab refreshSeq={refreshSeq} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
