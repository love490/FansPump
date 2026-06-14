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
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <Rocket className="h-6 w-6 text-primary sm:h-7 sm:w-7 lg:h-9 lg:w-9" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/swap",
    label: "Swap",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <ArrowLeftRight className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/verify",
    label: "Verify",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <ShieldCheck className="h-6 w-6 text-primary sm:h-7 sm:w-7 lg:h-9 lg:w-9" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/following",
    label: "Community",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/staking",
    label: "Launch Pool",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <Megaphone className="h-6 w-6 text-primary sm:h-7 sm:w-7 lg:h-9 lg:w-9" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/earn",
    label: "Earn",
    accent: "gradient",
    icon: (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-primary to-amber-400 p-[2px] shadow-sm sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-background">
          <CircleDollarSign className="h-6 w-6 text-primary sm:h-7 sm:w-7 lg:h-9 lg:w-9" strokeWidth={1.75} />
        </span>
      </span>
    ),
  },
];

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="group flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/80 px-2 py-4 text-center transition-colors hover:border-primary/35 hover:bg-primary/5 sm:gap-2.5 sm:px-3 sm:py-5 lg:min-h-[9.5rem] lg:gap-3 lg:px-4 lg:py-7"
    >
      <div className="transition-transform group-hover:scale-105">{action.icon}</div>
      <span
        className={cn(
          "max-w-full px-1 text-[11px] font-semibold leading-tight text-foreground sm:text-xs lg:text-sm",
          action.accent === "gradient" &&
            "bg-gradient-to-r from-violet-600 to-amber-500 bg-clip-text text-transparent"
        )}
      >
        {action.label}
      </span>
    </Link>
  );
}

function DexLinkCard({ link }: { link: (typeof dexNavLinks)[number] }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className="group flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/80 px-2 py-4 text-center transition-colors hover:border-primary/35 hover:bg-primary/5 sm:gap-2.5 sm:px-3 sm:py-5 lg:min-h-[9.5rem] lg:gap-3 lg:px-4 lg:py-7"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/5 transition-transform group-hover:scale-105 sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <Icon className="h-6 w-6 text-primary sm:h-7 sm:w-7 lg:h-9 lg:w-9" strokeWidth={1.75} />
      </span>
      <span className="max-w-full px-1 text-[11px] font-semibold leading-tight text-foreground sm:text-xs lg:text-sm">
        {link.label}
      </span>
    </Link>
  );
}

export function LandingQuickActions() {
  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-6xl xl:max-w-7xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border/80 bg-gradient-to-r from-primary/5 via-background to-primary/5 px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
              Quick actions
            </p>
          </div>

          <div className="space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:gap-5">
              {primaryActions.map((action) => (
                <QuickActionCard key={action.href} action={action} />
              ))}
            </div>

            <div className="border-t border-border/80 pt-5 sm:pt-6">
              <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-4 sm:text-xs lg:text-sm">
                {DEX_LABEL}
              </p>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:gap-5">
                {dexNavLinks.map((link) => (
                  <DexLinkCard key={link.id} link={link} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
