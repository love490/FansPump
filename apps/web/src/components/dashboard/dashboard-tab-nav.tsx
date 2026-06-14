"use client";

import { cn } from "@/lib/utils";

export type DashboardTabId = "tokens" | "defi" | "earnings" | "activities";

const TABS: { id: DashboardTabId; label: string }[] = [
  { id: "tokens", label: "My token" },
  { id: "defi", label: "DeFi" },
  { id: "earnings", label: "My Purse" },
  { id: "activities", label: "Activities" },
];

type DashboardTabNavProps = {
  active: DashboardTabId;
  onChange: (tab: DashboardTabId) => void;
};

export function DashboardTabNav({ active, onChange }: DashboardTabNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4",
            active === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
