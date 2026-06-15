"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { TOKEN_FEATURES, hasFeature } from "@iopn/shared";
import { tokenAbi } from "@/lib/abis/factory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type TrustPanelConfig = {
  showVerifiedCreator: boolean;
  showOwnershipRenounced: boolean;
  showLiquidityLocked: boolean;
  showMintable: boolean;
  showBurnable: boolean;
  showBlacklist: boolean;
  showPausable: boolean;
  showAntiBot: boolean;
};

const DEFAULT_CONFIG: TrustPanelConfig = {
  showVerifiedCreator: true,
  showOwnershipRenounced: true,
  showLiquidityLocked: true,
  showMintable: true,
  showBurnable: true,
  showBlacklist: true,
  showPausable: true,
  showAntiBot: true,
};

type TrustRow = { label: string; value: boolean | null; show: boolean };

type TokenTrustPanelProps = {
  tokenAddress: string;
  featureFlags: number;
  creatorVerified: boolean;
  liquidityLocked?: boolean;
  ownershipRenouncedDb?: boolean;
};

function TrustItem({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium",
          value ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
        )}
      >
        {value ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" /> Yes
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5" /> No
          </>
        )}
      </span>
    </div>
  );
}

export function TokenTrustPanel({
  tokenAddress,
  featureFlags,
  creatorVerified,
  liquidityLocked = false,
  ownershipRenouncedDb = false,
}: TokenTrustPanelProps) {
  const [config, setConfig] = useState<TrustPanelConfig>(DEFAULT_CONFIG);

  const { data: renouncedOnChain } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi,
    functionName: "isOwnershipRenounced",
  });

  useEffect(() => {
    fetch(apiUrl("/api/trust-panel-config"))
      .then((r) => r.json())
      .then((d) => {
        if (d?.config) setConfig({ ...DEFAULT_CONFIG, ...d.config });
      })
      .catch(() => {});
  }, []);

  const ownershipRenounced = Boolean(renouncedOnChain ?? ownershipRenouncedDb);

  const rows: TrustRow[] = [
    { label: "Verified Creator", value: creatorVerified, show: config.showVerifiedCreator },
    { label: "Ownership Renounced", value: ownershipRenounced, show: config.showOwnershipRenounced },
    { label: "Liquidity Locked", value: liquidityLocked, show: config.showLiquidityLocked },
    { label: "Mintable", value: hasFeature(featureFlags, TOKEN_FEATURES.MINTABLE), show: config.showMintable },
    { label: "Burnable", value: hasFeature(featureFlags, TOKEN_FEATURES.BURNABLE), show: config.showBurnable },
    { label: "Blacklist Enabled", value: hasFeature(featureFlags, TOKEN_FEATURES.BLACKLIST), show: config.showBlacklist },
    { label: "Pausable", value: hasFeature(featureFlags, TOKEN_FEATURES.PAUSABLE), show: config.showPausable },
    { label: "Anti-Bot Enabled", value: hasFeature(featureFlags, TOKEN_FEATURES.ANTI_BOT), show: config.showAntiBot },
  ].filter((r) => r.show);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" /> Trust & Transparency
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <TrustItem key={row.label} label={row.label} value={row.value} />
        ))}
      </CardContent>
    </Card>
  );
}
