"use client";

import { LandingHero } from "@/components/landing/landing-hero";
import { LandingQuickActions } from "@/components/landing/landing-quick-actions";
import { LandingTrustPreview } from "@/components/landing/landing-trust-preview";
import { HomeTokenSections } from "@/components/home/home-token-sections";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingTrustDashboard } from "@/components/landing/landing-trust-dashboard";

/** Home page content — uses app shell sidebar + top bar from layout. */
export function HomePage() {
  return (
    <div className="flex w-full flex-col">
      <LandingHero />

      <div className="w-full pb-8 pt-4 sm:pb-10 sm:pt-5">
        <LandingQuickActions />
      </div>

      <div className="w-full space-y-14 pb-16 pt-2 sm:space-y-16 sm:pb-20 sm:pt-3">
        <HomeTokenSections />
      </div>

      <div className="w-full space-y-14 py-14 sm:space-y-16 sm:py-16">
        <LandingTrustPreview />
      </div>

      <LandingHowItWorks />

      <div className="w-full border-t border-border py-14 sm:py-16">
        <LandingTrustDashboard />
      </div>
    </div>
  );
}
