"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_BLUE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const heroBtnBase = cn(
  "h-9 shrink-0 gap-1.5 px-3 text-xs font-semibold sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
);

const heroBtnPrimary = cn(
  heroBtnBase,
  "border-transparent text-white shadow-[0_0_20px_rgba(30,91,255,0.25)] hover:opacity-90"
);

const heroBtnSecondary = cn(
  heroBtnBase,
  "border border-white/10 bg-[#151c28]/80 text-foreground backdrop-blur-sm hover:bg-[#1c2536]/90 dark:bg-[#151c28]/80 dark:hover:bg-[#1c2536]/90"
);

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 xl:px-10">
      <div
        className="relative min-h-[220px] w-full overflow-hidden rounded-2xl border border-primary/20 shadow-lg shadow-primary/5 sm:min-h-[260px] lg:min-h-[300px]"
        style={{
          backgroundImage: "url(/images/hero-banner-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center right",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Left-side scrim so copy stays readable over the banner art */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050a14]/95 via-[#050a14]/75 to-[#050a14]/15" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,91,255,0.15),transparent_55%)]" />

        <div className="relative px-5 py-10 sm:px-8 sm:py-12 lg:max-w-[62%] lg:px-10 lg:py-14">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary sm:text-xs">
            IOPn Ecosystem
          </p>
          <h1 className="mt-2 text-2xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-3xl lg:text-4xl">
            Create, Discover &amp; Grow on OPN
          </h1>
          <p className="mt-3 text-base font-medium text-white/95 sm:text-lg">
            Launch tokens. Build communities. Earn trust.
          </p>
          <p className="mt-1.5 text-sm text-white/70 sm:text-base">
            The Trust &amp; Growth Platform for the IOPn Ecosystem.
          </p>

          <div
            className={cn(
              "mt-6 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 sm:mt-8",
              "[-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible",
              "[&::-webkit-scrollbar]:hidden"
            )}
          >
            <Button
              asChild
              size="sm"
              className={heroBtnPrimary}
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Link href="/create" className="inline-flex items-center whitespace-nowrap">
                <PlusCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                Create Token
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className={heroBtnSecondary}>
              <Link href="/discover?section=trending" className="inline-flex items-center whitespace-nowrap">
                Explore Projects
                <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className={heroBtnSecondary}>
              <Link href="/app" className="inline-flex items-center whitespace-nowrap">
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                Launch App
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
