"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CircleDollarSign,
  Megaphone,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dexNavLinks } from "@/lib/navigation/dex-nav";

type QuickAction = {
  href: string;
  label: string;
  icon: ReactNode;
  accent?: "gradient";
};

const primaryActions: QuickAction[] = [
  {
    href: "/swap",
    label: "Dex",
    icon: (
      <Image
        src="/images/quick-actions/dex.png"
        alt=""
        width={56}
        height={56}
        className="h-14 w-14 object-contain"
      />
    ),
  },
  {
    href: "/create",
    label: "Create Token",
    icon: (
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
        <Rocket className="h-7 w-7 text-primary" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/verify",
    label: "Verify Ownership",
    icon: (
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
        <ShieldCheck className="h-7 w-7 text-primary" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/following",
    label: "Build Community",
    icon: (
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Users className="h-7 w-7" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/staking",
    label: "Launch Pool",
    icon: (
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
        <Megaphone className="h-7 w-7 text-primary" strokeWidth={1.75} />
      </span>
    ),
  },
  {
    href: "/earn",
    label: "Earn",
    accent: "gradient",
    icon: (
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-primary to-amber-400 p-[2px] shadow-sm">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-background">
          <CircleDollarSign className="h-7 w-7 text-primary" strokeWidth={1.75} />
        </span>
      </span>
    ),
  },
];

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="group flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-colors hover:bg-muted/40"
    >
      <div className="transition-transform group-hover:scale-105">{action.icon}</div>
      <span
        className={cn(
          "text-xs font-semibold leading-tight text-foreground sm:text-sm",
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
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {primaryActions.map((action) => (
            <QuickActionCard key={action.label} action={action} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            DEX
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {dexNavLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:text-sm"
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
