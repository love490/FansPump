"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLiquidityPanel } from "@/components/liquidity/add-liquidity-panel";
import { MyLiquidityList } from "@/components/liquidity/my-liquidity-list";
import { RemoveLiquidityPanel } from "@/components/liquidity/remove-liquidity-panel";
import { StatGrid } from "@/components/defi/defi-stats-overview";
import { parseLiquidityPairId } from "@/lib/liquidity/pair-tokens";
import { useAccount } from "wagmi";
import { useMyLiquidityPositions } from "@/hooks/liquidity/useMyLiquidityPositions";
import { useBasePoolLpPositions } from "@/hooks/liquidity/useBasePoolLpPositions";

type LiquidityTab = "add" | "remove";

type LiquidityWorkspaceProps = {
  refreshSeq?: number;
  onLiquidityAdded?: () => void;
};

function tabFromSearchParams(searchParams: URLSearchParams): LiquidityTab {
  return searchParams.get("tab") === "remove" ? "remove" : "add";
}

function RemoveLiquidityTab({
  refreshSeq,
  removeToken,
  removePairId,
  onRemoved,
}: {
  refreshSeq: number;
  removeToken: string;
  removePairId: ReturnType<typeof parseLiquidityPairId> | null;
  onRemoved: () => void;
}) {
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
      {removeToken && removePairId && (
        <RemoveLiquidityPanel
          tokenAddress={removeToken}
          pairId={removePairId}
          onRemoved={onRemoved}
        />
      )}

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
    </div>
  );
}

function LiquidityWorkspaceInner({ refreshSeq = 0, onLiquidityAdded }: LiquidityWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = tabFromSearchParams(searchParams);
  const initialToken = searchParams.get("token")?.trim() ?? "";
  const removeToken = searchParams.get("token")?.trim() ?? "";
  const removePairId = searchParams.get("pair")
    ? parseLiquidityPairId(searchParams.get("pair"))
    : null;
  const [tab, setTab] = useState<LiquidityTab>(urlTab);
  const [listRefresh, setListRefresh] = useState(refreshSeq);

  useEffect(() => {
    setListRefresh(refreshSeq);
  }, [refreshSeq]);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  const selectTab = useCallback(
    (next: LiquidityTab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "remove") {
        params.set("tab", "remove");
      } else {
        params.delete("tab");
        params.delete("pair");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleLiquidityRemoved = useCallback(() => {
    setListRefresh((n) => n + 1);
    onLiquidityAdded?.();
  }, [onLiquidityAdded]);

  const handleLiquidityAdded = useCallback(() => {
    onLiquidityAdded?.();
    selectTab("remove");
  }, [onLiquidityAdded, selectTab]);

  return (
    <div className="space-y-4">
      <Card className="overflow-visible">
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
                onClick={() => selectTab(item.id)}
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

        <CardContent className="overflow-visible pt-5">
          {tab === "add" ? (
            <AddLiquidityPanel initialToken={initialToken} onLiquidityAdded={handleLiquidityAdded} />
          ) : (
            <RemoveLiquidityTab
              refreshSeq={listRefresh}
              removeToken={removeToken}
              removePairId={removePairId}
              onRemoved={handleLiquidityRemoved}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function LiquidityWorkspace(props: LiquidityWorkspaceProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
      <LiquidityWorkspaceInner {...props} />
    </Suspense>
  );
}
