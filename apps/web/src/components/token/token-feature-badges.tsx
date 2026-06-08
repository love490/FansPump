"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { TOKEN_FEATURES, hasFeature, FEATURE_LABELS, FEATURE_DESCRIPTIONS } from "@iopn/shared";
import { tokenAbi } from "@/lib/abis/factory";
import { Badge } from "@/components/ui/badge";
import { FeatureInfo } from "@/components/ui/feature-info";
import { InfoTickButton } from "@/components/ui/info-tick-button";
import { cn } from "@/lib/utils";
import { TokenTaxBadge } from "@/components/token/token-tax-badge";

type TokenFeatureBadgesProps = {
  tokenAddress: string;
  featureFlags: number;
  buyTaxBps?: number | null;
  sellTaxBps?: number | null;
};

export function TokenFeatureBadges({
  tokenAddress,
  featureFlags,
  buyTaxBps,
  sellTaxBps,
}: TokenFeatureBadgesProps) {
  const [tradableInfoOpen, setTradableInfoOpen] = useState(false);

  const hasTradingSwitch = hasFeature(featureFlags, TOKEN_FEATURES.TRADING_SWITCH);
  const hasBurnable = hasFeature(featureFlags, TOKEN_FEATURES.BURNABLE);
  const hasTaxFeature = hasFeature(featureFlags, TOKEN_FEATURES.TAXABLE);
  const taxEnabled =
    hasTaxFeature &&
    buyTaxBps != null &&
    sellTaxBps != null &&
    (buyTaxBps > 0 || sellTaxBps > 0);

  const { data: tradingEnabled } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "tradingEnabled",
    query: { enabled: hasTradingSwitch },
  });

  const otherFeatures = (Object.entries(TOKEN_FEATURES) as [keyof typeof TOKEN_FEATURES, number][])
    .filter(([key, bit]) => {
      if ((featureFlags & bit) === 0) return false;
      if (key === "TRADING_SWITCH" || key === "BURNABLE" || key === "TAXABLE") return false;
      return true;
    })
    .map(([key]) => FEATURE_LABELS[key]);

  return (
    <div className="flex flex-wrap gap-2">
      {hasBurnable && (
        <Badge variant="secondary" className="gap-1">
          Burnable &amp; locked
        </Badge>
      )}

      <TokenTaxBadge
        buyTaxBps={buyTaxBps}
        sellTaxBps={sellTaxBps}
        taxEnabled={taxEnabled}
      />

      {hasTradingSwitch && (
        <div className="inline-flex flex-col gap-1 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm sm:flex-row sm:items-center sm:gap-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">Tradable:</span>
            <span className={cn("font-semibold", tradingEnabled ? "text-green-600" : "text-amber-600")}>
              {tradingEnabled ? "Yes" : "No"}
            </span>
            <InfoTickButton
              aria-label="Tradable info"
              variant={tradingEnabled ? "success" : "warning"}
              onClick={() => setTradableInfoOpen((o) => !o)}
            />
          </span>
          {tradableInfoOpen && (
            <span className="text-xs text-muted-foreground">
              Tradable enable switch {tradingEnabled ? "active" : "inactive"}.
            </span>
          )}
        </div>
      )}

      {otherFeatures.map((label) => {
        const key = (Object.entries(FEATURE_LABELS) as [keyof typeof FEATURE_LABELS, string][]).find(
          ([, v]) => v === label
        )?.[0];
        return (
          <Badge key={label} variant="secondary" className="inline-flex items-center gap-1">
            {label}
            {key && (
              <FeatureInfo
                title={label}
                description={FEATURE_DESCRIPTIONS[key]}
                className="ml-0.5"
              />
            )}
          </Badge>
        );
      })}
    </div>
  );
}
