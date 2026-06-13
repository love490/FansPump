"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingTrustDashboard } from "@/components/landing/landing-trust-dashboard";
import { LandingTrustPreview } from "@/components/landing/landing-trust-preview";
import { LandingTopBuilders } from "@/components/landing/landing-top-builders";
import {
  LandingNewlyCreatedPreview,
  LandingTrendingPreview,
  LandingVerifiedPreview,
} from "@/components/landing/landing-token-previews";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { Footer } from "@/components/layout/footer";

export function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <LandingHeader />

      <main className="w-full flex-1">
        <LandingHero />

        <div className="w-full space-y-14 px-4 pb-16 pt-8 sm:space-y-16 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10 xl:px-10">
          <LandingTrustDashboard />
          <LandingTrustPreview />
          <LandingTrendingPreview />
          <LandingTopBuilders />
          <LandingVerifiedPreview />
          <LandingNewlyCreatedPreview />
        </div>

        <LandingHowItWorks />

        <section className="w-full border-t border-border bg-gradient-to-b from-primary/5 to-background py-14 sm:py-16">
          <div className="mx-auto w-full max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Trust infrastructure for the IOPn ecosystem
            </h2>
            <p className="mt-2 text-muted-foreground">
              Create tokens, discover projects, evaluate trust, and track builders — all on OPNChain.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-[0_0_20px_rgba(30,91,255,0.2)]">
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
