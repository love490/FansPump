"use client";

import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingQuickActions } from "@/components/landing/landing-quick-actions";
import { LandingTrustPreview } from "@/components/landing/landing-trust-preview";
import {
  LandingNewlyCreatedPreview,
  LandingTrendingPreview,
} from "@/components/landing/landing-token-previews";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingTrustDashboard } from "@/components/landing/landing-trust-dashboard";
import { Footer } from "@/components/layout/footer";

export function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <LandingHeader />

      <main className="w-full flex-1">
        <LandingHero />

        <div className="w-full pb-8 pt-4 sm:pb-10 sm:pt-5">
          <LandingQuickActions />
        </div>

        <div className="w-full space-y-14 px-4 pb-16 pt-2 sm:space-y-16 sm:px-6 lg:px-8 lg:pb-20 lg:pt-3 xl:px-10">
          <LandingTrendingPreview />
          <LandingNewlyCreatedPreview />
        </div>

        <div className="w-full space-y-14 px-4 py-14 sm:space-y-16 sm:px-6 sm:py-16 lg:px-8 xl:px-10">
          <LandingTrustPreview />
        </div>

        <LandingHowItWorks />

        <div className="w-full border-t border-border px-4 py-14 sm:px-6 sm:py-16 lg:px-8 xl:px-10">
          <LandingTrustDashboard />
        </div>
      </main>

      <Footer />
    </div>
  );
}
