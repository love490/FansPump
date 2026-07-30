"use client";

import Link from "next/link";
import { ArrowLeftRight, Droplets, Flame, Lock, PlusCircle, Rocket } from "lucide-react";
import { liquidityUrl, toolsBurnUrl, toolsLockUrl } from "@/lib/navigation/liquidity-routes";

const ACTIONS: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/create", label: "Create token", icon: <PlusCircle className="h-4 w-4" /> },
  { href: "/swap", label: "Swap", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { href: liquidityUrl(), label: "Add liquidity", icon: <Droplets className="h-4 w-4" /> },
  { href: "/launchpool", label: "LaunchPool", icon: <Rocket className="h-4 w-4" /> },
  { href: toolsLockUrl(), label: "Lock tokens", icon: <Lock className="h-4 w-4" /> },
  { href: toolsBurnUrl(), label: "Burn tokens", icon: <Flame className="h-4 w-4" /> },
];

export function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-center text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <span className="text-primary">{action.icon}</span>
          <span className="leading-tight">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
