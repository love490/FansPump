"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import {
  LandingNewlyCreatedPreview,
  LandingTrendingPreview,
  LandingVerifiedPreview,
} from "@/components/landing/landing-token-previews";
import { LandingStats } from "@/components/landing/landing-stats";
import { Footer } from "@/components/layout/footer";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />

      <main className="flex-1">
        <LandingHero />

        <div className="mx-auto max-w-6xl space-y-12 px-4 pb-16 pt-6 sm:space-y-14 sm:px-6 sm:pb-20 sm:pt-8">
          <LandingTrendingPreview />
          <LandingNewlyCreatedPreview />
          <LandingStats />
          <LandingVerifiedPreview />
        </div>

        <LandingFeatures />
        <LandingHowItWorks />

        <section className="border-t border-border bg-primary/5 py-14 sm:py-16">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to launch?</h2>
            <p className="mt-2 text-muted-foreground">
              Join creators building on OPNChain with FansPump.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/home">Launch App</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/create">
                  Create Token <Rocket className="ml-2 h-4 w-4" />
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
