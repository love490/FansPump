"use client";

import Link from "next/link";
import { ArrowLeftRight, Droplets, Flame, Lock, PlusCircle, Rocket } from "lucide-react";
import { liquidityUrl, toolsBurnUrl, toolsLockUrl } from "@/lib/navigation/liquidity-routes";
import { cn } from "@/lib/utils";

type QuickAction = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Gradient + icon tint applied on the icon tile. */
  tone: string;
};

const ACTIONS: QuickAction[] = [
  {
    href: "/create",
    label: "Create token",
    icon: <PlusCircle className="h-5 w-5" />,
    tone: "from-primary/20 to-primary/5 text-primary",
  },
  {
    href: "/swap",
    label: "Swap",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    tone: "from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400",
  },
  {
    href: liquidityUrl(),
    label: "Add liquidity",
    icon: <Droplets className="h-5 w-5" />,
    tone: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/launchpool",
    label: "LaunchPool",
    icon: <Rocket className="h-5 w-5" />,
    tone: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400",
  },
  {
    href: toolsLockUrl(),
    label: "Lock tokens",
    icon: <Lock className="h-5 w-5" />,
    tone: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
  },
  {
    href: toolsBurnUrl(),
    label: "Burn tokens",
    icon: <Flame className="h-5 w-5" />,
    tone: "from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400",
  },
];

export function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "group flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 text-center",
            "shadow-sm transition-all duration-200",
            "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
            "active:translate-y-0 active:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-200 group-hover:scale-105",
              action.tone
            )}
          >
            {action.icon}
          </span>
          <span className="text-[11px] font-semibold leading-tight sm:text-xs">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
