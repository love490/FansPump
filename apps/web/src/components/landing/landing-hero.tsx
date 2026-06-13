"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_BLUE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const heroBtnClass = cn(
  "h-10 w-full gap-2 px-4 text-sm font-semibold sm:h-11 sm:w-auto sm:px-4"
);

const heroBtnBlueClass = cn(
  heroBtnClass,
  "border-transparent text-white shadow-[0_0_20px_rgba(30,91,255,0.25)] hover:opacity-90"
);

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8 lg:pt-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,91,255,0.12),transparent_50%)]" />

      <div className="relative mx-auto max-w-4xl rounded-xl border border-primary/20 bg-gradient-to-br from-[#0a1628]/80 via-card to-primary/10 p-4 shadow-lg shadow-primary/5 sm:p-6 lg:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary sm:text-xs">
          IOPn Ecosystem
        </p>
        <h1 className="mt-1 text-[1.4rem] font-extrabold leading-[1.2] tracking-tight sm:mt-1.5 sm:text-2xl lg:text-3xl">
          Create, Discover &amp; Grow on OPN
        </h1>
        <p className="mt-1.5 text-sm font-medium text-foreground sm:mt-2 sm:text-base">
          Launch tokens. Build communities. Earn trust.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          The Trust &amp; Growth Platform for the IOPn Ecosystem.
        </p>

        <div className="mt-4 flex w-full flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap">
          <Button
            asChild
            size="sm"
            className={heroBtnBlueClass}
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <Link href="/create" className="inline-flex items-center justify-center whitespace-nowrap">
              <PlusCircle className="h-4 w-4 shrink-0" />
              Create Token
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className={heroBtnBlueClass}
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <Link href="/discover?section=trending" className="inline-flex items-center justify-center whitespace-nowrap">
              Explore Projects
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className={heroBtnBlueClass}
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <Link href="/app" className="inline-flex items-center justify-center whitespace-nowrap">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Launch App
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
