"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_BLUE } from "@/lib/brand";
import { LandingTrustVisual } from "@/components/landing/landing-trust-visual";
import { cn } from "@/lib/utils";

const heroBtnClass = cn(
  "h-9 shrink-0 gap-1.5 px-2.5 text-xs font-semibold sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
);

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden px-3 pt-3 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 xl:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,91,255,0.12),transparent_50%)]" />

      <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-card via-background to-primary/5 p-4 shadow-lg sm:p-8 lg:grid lg:grid-cols-2 lg:gap-10 lg:p-10">
        <div className="flex flex-col justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary sm:text-sm">
            IOPn Ecosystem
          </p>
          <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-[1.15] tracking-tight sm:mt-2 sm:text-4xl lg:text-5xl">
            Create, Discover &amp; Grow on OPN
          </h1>
          <p className="mt-2 text-sm font-medium text-foreground sm:mt-3 sm:text-xl">
            Launch tokens. Build communities. Earn trust.
          </p>
          <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-base">
            The Trust &amp; Growth Platform for the IOPn Ecosystem.
          </p>

          <div className="mt-4 flex flex-row flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-6 sm:flex-wrap sm:gap-3 sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            <Button
              asChild
              size="sm"
              className={cn(heroBtnClass, "shadow-[0_0_20px_rgba(30,91,255,0.25)]")}
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Link href="/create" className="inline-flex items-center whitespace-nowrap">
                <PlusCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                Create Token
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className={heroBtnClass}>
              <Link href="/discover?section=trending" className="inline-flex items-center whitespace-nowrap">
                Explore Projects
                <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className={heroBtnClass}>
              <Link href="/app" className="inline-flex items-center whitespace-nowrap">
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                Launch App
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 hidden items-center lg:mt-0 lg:flex lg:justify-end">
          <div className="w-full max-w-md lg:max-w-none">
            <LandingTrustVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
