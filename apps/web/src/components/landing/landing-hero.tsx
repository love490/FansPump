"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND_BLUE } from "@/lib/brand";
import { LandingTrustVisual } from "@/components/landing/landing-trust-visual";

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 xl:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,91,255,0.12),transparent_50%)]" />

      <div className="relative grid gap-8 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-background to-primary/5 p-6 shadow-lg sm:p-8 lg:grid-cols-2 lg:gap-10 lg:p-10">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary sm:text-sm">
            IOPn Ecosystem
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Create, Discover &amp; Grow on OPN
          </h1>
          <p className="mt-3 text-lg font-medium text-foreground sm:text-xl">
            Launch tokens. Build communities. Earn trust.
          </p>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            The Trust &amp; Growth Platform for the IOPn Ecosystem.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <Button
              asChild
              size="lg"
              className="shadow-[0_0_20px_rgba(30,91,255,0.25)]"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Link href="/create" className="inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Create Token
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/discover?section=trending" className="inline-flex items-center gap-2">
                Explore Projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/app" className="inline-flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Launch App
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center lg:justify-end">
          <div className="w-full max-w-md lg:max-w-none">
            <LandingTrustVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
