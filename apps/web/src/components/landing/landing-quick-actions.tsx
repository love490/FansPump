"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CircleDollarSign,
  Megaphone,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dexNavLinks, DEX_LABEL } from "@/lib/navigation/swap-nav";

type QuickAction = {
  href: string;
  label: string;
  icon: ReactNode;
  accent?: "gradient";
};

const primaryActions: QuickAction[] = [
  {
    href: "/create",
    label: "Create Token",
    icon: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <Rocket className="h-5 w-5 text-primary sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/swap",
    label: "Swap",
    icon: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <ArrowLeftRight className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/verify",
    label: "Verify",
    icon: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <ShieldCheck className="h-5 w-5 text-primary sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/following",
    label: "Community",
    icon: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/staking",
    label: "Launch Pool",
    icon: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <Megaphone className="h-5 w-5 text-primary sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/earn",
    label: "Earn",
    accent: "gradient",
    icon: (
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-primary to-amber-400 p-[2px] shadow-sm sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-background">
          <CircleDollarSign className="h-5 w-5 text-primary sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={1.75} />
        </span>
      </span>
    ),
  },
];

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-2 py-3 text-center transition-colors hover:border-primary/35 hover:bg-primary/5 sm:gap-2 sm:px-2.5 sm:py-4 lg:py-5"
    >
      <div className="transition-transform group-hover:scale-105">{action.icon}</div>
      <span
        className={cn(
          "max-w-full px-0.5 text-[11px] font-semibold leading-tight text-foreground sm:text-xs",
          action.accent === "gradient" &&
            "bg-gradient-to-r from-violet-600 to-amber-500 bg-clip-text text-transparent"
        )}
      >
        {action.label}
      </span>
    </Link>
  );
}

export function LandingQuickActions() {
  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-6xl xl:max-w-7xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-7">
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:gap-4">
              {primaryActions.map((action) => (
                <QuickActionCard key={action.href} action={action} />
              ))}
            </div>

            <div className="w-full rounded-xl border border-border/80 bg-muted/20 px-4 py-5 sm:px-5 sm:py-6 lg:py-7">
              <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-5 sm:text-xs">
                {DEX_LABEL}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                {dexNavLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:px-4 sm:py-2.5 sm:text-sm"
                  >
                    <link.icon className="h-4 w-4 shrink-0 text-primary" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
