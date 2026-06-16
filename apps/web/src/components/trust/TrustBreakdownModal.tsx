"use client";

import { useState } from "react";
import { X, Shield, Droplets, BarChart2, User } from "lucide-react";
import { TrustScoreBar } from "@/components/trust/TrustScoreBar";
import { TrustBadge } from "@/components/trust/TrustBadge";
import type { TrustView } from "@/hooks/useTrustScore";

type TrustBreakdownModalProps = {
  data: TrustView;
  isOpen: boolean;
  onClose: () => void;
};

const COMPONENTS = [
  {
    key: "contractSafety" as const,
    label: "Contract Safety",
    icon: Shield,
    weight: 0.35,
    colorClass: "bg-violet-500",
    signalKey: "contract" as const,
    rows: (d: TrustView) => [
      { label: "Ownership renounced", value: d.signals.contract.ownershipRenounced as boolean },
      { label: "Mint authority revoked", value: d.signals.contract.mintAuthorityRevoked as boolean },
      { label: "Source verified", value: d.signals.contract.sourceVerified as boolean },
      { label: "No honeypot risk", value: !(d.signals.contract.honeypotRisk as boolean) },
    ],
  },
  {
    key: "liquiditySafety" as const,
    label: "Liquidity Safety",
    icon: Droplets,
    weight: 0.25,
    colorClass: "bg-blue-500",
    signalKey: "liquidity" as const,
    rows: (d: TrustView) => [
      { label: "Liquidity locked", value: d.signals.liquidity.liquidityLocked as boolean },
      {
        label: "Lock duration (days)",
        value: d.signals.liquidity.lockDurationDays as number,
        type: "number" as const,
      },
      {
        label: "Depth (USD)",
        value: d.signals.liquidity.liquidityDepthUSD as number,
        type: "currency" as const,
      },
    ],
  },
  {
    key: "marketIntegrity" as const,
    label: "Market Integrity",
    icon: BarChart2,
    weight: 0.25,
    colorClass: "bg-cyan-500",
    signalKey: "market" as const,
    rows: (d: TrustView) => [
      {
        label: "Top 10 holder %",
        value: d.signals.market.top10HolderPercent as number,
        type: "percent" as const,
      },
      {
        label: "Unique buyers (24h)",
        value: d.signals.market.uniqueBuyersLast24h as number,
        type: "number" as const,
      },
      {
        label: "Wash trading score",
        value: d.signals.market.washTradingScore as number,
        type: "number" as const,
      },
    ],
  },
  {
    key: "creatorReputation" as const,
    label: "Creator Reputation",
    icon: User,
    weight: 0.15,
    colorClass: "bg-amber-500",
    signalKey: "creator" as const,
    rows: (d: TrustView) => [
      { label: "Prior tokens", value: d.signals.creator.priorTokenCount as number, type: "number" as const },
      { label: "Rug count", value: d.signals.creator.priorRugCount as number, type: "number" as const },
      {
        label: "Avg survival 30d",
        value: d.signals.creator.avgTokenSurvival30d as number,
        type: "percent" as const,
      },
    ],
  },
];

function SignalRow({
  label,
  value,
  type,
}: {
  label: string;
  value: boolean | number;
  type?: "number" | "percent" | "currency";
}) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-medium ${value ? "text-emerald-600" : "text-red-600"}`}>
          {value ? "✓ Yes" : "✗ No"}
        </span>
      </div>
    );
  }

  let display = String(value);
  if (type === "percent") display = `${Number(value).toFixed(1)}%`;
  if (type === "currency") display = `$${Number(value).toLocaleString()}`;

  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{display}</span>
    </div>
  );
}

export function TrustBreakdownModal({ data, isOpen, onClose }: TrustBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<(typeof COMPONENTS)[number]["key"]>("contractSafety");

  if (!isOpen) return null;

  const activeComponent = COMPONENTS.find((c) => c.key === activeTab)!;
  const Icon = activeComponent.icon;
  const componentScore = data[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <TrustBadge tier={data.tier} score={data.score} size="lg" />
            <span className="text-sm text-muted-foreground">Trust Score</span>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 border-b border-border p-6">
          {COMPONENTS.map((c) => (
            <TrustScoreBar
              key={c.key}
              label={c.label}
              score={data[c.key]}
              weight={c.weight}
              colorClass={c.colorClass}
            />
          ))}
        </div>

        <div className="flex overflow-x-auto border-b border-border">
          {COMPONENTS.map((c) => {
            const TabIcon = c.icon;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveTab(c.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
                  activeTab === c.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon size={12} />
                {c.label.split(" ")[0]}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Icon size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">{activeComponent.label}</span>
            <span className="ml-auto text-2xl font-bold tabular-nums">{componentScore}</span>
          </div>
          <div>
            {activeComponent.rows(data).map((row, i) => (
              <SignalRow key={i} {...row} />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          <p className="text-xs text-muted-foreground">
            Score refreshes every 30 minutes. Last updated: {new Date(data.calculatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
