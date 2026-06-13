"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_BLUE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const ctaBtnBase = cn(
  "h-10 gap-2 px-4 text-sm font-semibold sm:h-11 sm:px-5"
);

const ctaBtnPrimary = cn(
  ctaBtnBase,
  "border-transparent text-white shadow-[0_0_20px_rgba(30,91,255,0.25)] hover:opacity-90"
);

const ctaBtnSecondary = cn(
  ctaBtnBase,
  "border border-white/10 bg-[#151c28] text-foreground hover:bg-[#1c2536] dark:bg-[#151c28] dark:hover:bg-[#1c2536]"
);

export function LandingCtaSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "border-b border-border bg-gradient-to-b from-primary/5 to-background py-12 sm:py-14",
        className
      )}
    >
      <div className="mx-auto w-full max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Trust infrastructure for the IOPn ecosystem
        </h2>
        <p className="mt-2 text-muted-foreground">
          Create tokens, discover projects, evaluate trust, and track builders — all on OPNChain.
        </p>
        <div
          className={cn(
            "mt-6 flex flex-row flex-nowrap items-center justify-center gap-2 overflow-x-auto pb-0.5",
            "[-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:gap-3",
            "[&::-webkit-scrollbar]:hidden"
          )}
        >
          <Button asChild size="lg" className={ctaBtnPrimary} style={{ backgroundColor: BRAND_BLUE }}>
            <Link href="/create" className="inline-flex items-center whitespace-nowrap">
              <PlusCircle className="h-4 w-4 shrink-0" />
              Create Token
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className={ctaBtnSecondary}>
            <Link href="/discover?section=trending" className="inline-flex items-center whitespace-nowrap">
              Explore Projects
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className={ctaBtnSecondary}>
            <Link href="/app" className="inline-flex items-center whitespace-nowrap">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Launch App
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
