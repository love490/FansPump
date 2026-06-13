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
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-14 sm:w-14">
        <Rocket className="h-6 w-6 text-primary sm:h-7 sm:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/swap",
    label: "Swap",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm sm:h-14 sm:w-14">
        <ArrowLeftRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/verify",
    label: "Verify",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-14 sm:w-14">
        <ShieldCheck className="h-6 w-6 text-primary sm:h-7 sm:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/following",
    label: "Community",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm sm:h-14 sm:w-14">
        <Users className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/staking",
    label: "Launch Pool",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-14 sm:w-14">
        <Megaphone className="h-6 w-6 text-primary sm:h-7 sm:w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/earn",
    label: "Earn",
    accent: "gradient",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-primary to-amber-400 p-[2px] shadow-sm sm:h-14 sm:w-14">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-background">
          <CircleDollarSign className="h-6 w-6 text-primary sm:h-7 sm:w-7" strokeWidth={1.75} />
        </span>
      </span>
    ),
  },
];

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="group flex w-full min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 px-2 py-3 text-center transition-colors hover:border-primary/30 hover:bg-muted/50 sm:gap-2.5 sm:px-3 sm:py-4"
    >
      <div className="transition-transform group-hover:scale-105">{action.icon}</div>
      <span
        className={cn(
          "max-w-full px-0.5 text-[11px] font-semibold leading-tight text-foreground sm:text-xs",
          action.accent === "gradient" && "bg-gradient-to-r from-violet-600 to-amber-500 bg-clip-text text-transparent"
        )}
      >
        {action.label}
      </span>
    </Link>
  );
}

export function LandingQuickActions() {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-3xl space-y-4 sm:max-w-4xl sm:space-y-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {primaryActions.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {DEX_LABEL}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {dexNavLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:px-3 sm:text-xs"
              >
                <link.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
