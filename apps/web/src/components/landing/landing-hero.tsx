"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeftRight, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_BLUE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const heroBtnBase = cn(
  "h-10 w-full gap-1.5 px-4 text-xs font-semibold sm:h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm"
);

const heroBtnPrimary = cn(
  heroBtnBase,
  "border-transparent text-white shadow-[0_0_20px_rgba(30,91,255,0.25)] hover:opacity-90"
);

const heroBtnSecondary = cn(
  heroBtnBase,
  "border border-white/40 bg-white/10 text-white shadow-sm hover:bg-white/20 hover:text-white"
);

const HERO_BLUE = "#0d47aa";

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden px-4 pt-2 sm:px-6 sm:pt-3 lg:px-8 xl:px-10">
      <div
        className="relative min-h-[220px] w-full overflow-hidden rounded-2xl border border-[#0a3a88]/50 shadow-lg shadow-[#0d47aa]/25 sm:min-h-[260px] lg:min-h-[300px]"
        style={{ backgroundColor: HERO_BLUE }}
      >
        <div className="relative px-5 py-10 sm:px-8 sm:py-12 lg:max-w-[62%] lg:px-10 lg:py-14">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-200 sm:text-xs">
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

          <div className="mt-6 hidden flex-col gap-2 sm:mt-8 sm:flex sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              asChild
              size="sm"
              className={heroBtnPrimary}
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Link href="/create" className="inline-flex w-full items-center justify-center whitespace-nowrap sm:w-auto">
                <PlusCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                Create Token
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className={heroBtnSecondary}>
              <Link href="/explore" className="inline-flex w-full items-center justify-center whitespace-nowrap sm:w-auto">
                Explore
                <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className={heroBtnSecondary}>
              <Link href="/swap" className="inline-flex w-full items-center justify-center whitespace-nowrap sm:w-auto">
                <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                Swap
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
