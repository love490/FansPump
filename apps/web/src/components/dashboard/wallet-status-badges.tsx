"use client";

import { BadgeCheck, Coins, Link2, Sparkles, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusTone = "network" | "connected" | "creator" | "assets" | "verified";

const TONES: Record<StatusTone, string> = {
  network: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  connected: "border-primary/30 bg-primary/10 text-primary",
  creator: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  assets: "border-border bg-muted/60 text-muted-foreground",
  verified: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

function StatusBadge({
  tone,
  icon,
  children,
}: {
  tone: StatusTone;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONES[tone]
      )}
    >
      {icon}
      {children}
    </span>
  );
}

type WalletStatusBadgesProps = {
  networkName: string;
  isConnected: boolean;
  linkedWalletOnly?: boolean;
  isCreator?: boolean;
  assetCount?: number;
  isVerified?: boolean;
  className?: string;
};

export function WalletStatusBadges({
  networkName,
  isConnected,
  linkedWalletOnly = false,
  isCreator = false,
  assetCount,
  isVerified = false,
  className,
}: WalletStatusBadgesProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <StatusBadge tone="network" icon={<Wifi className="h-3 w-3" />}>
        {networkName}
      </StatusBadge>

      <StatusBadge tone="connected" icon={<Link2 className="h-3 w-3" />}>
        {isConnected ? "Wallet connected" : linkedWalletOnly ? "Linked wallet" : "Not connected"}
      </StatusBadge>

      {isCreator && (
        <StatusBadge tone="creator" icon={<Sparkles className="h-3 w-3" />}>
          Creator
        </StatusBadge>
      )}

      {typeof assetCount === "number" && assetCount > 0 && (
        <StatusBadge tone="assets" icon={<Coins className="h-3 w-3" />}>
          {assetCount} asset{assetCount === 1 ? "" : "s"}
        </StatusBadge>
      )}

      {isVerified && (
        <StatusBadge tone="verified" icon={<BadgeCheck className="h-3 w-3" />}>
          Verified
        </StatusBadge>
      )}
    </div>
  );
}
