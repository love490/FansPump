"use client";

import Link from "next/link";
import Image from "next/image";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingTrendingPreview } from "@/components/landing/landing-token-previews";

export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-8 lg:pt-10">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="relative min-h-[148px] overflow-hidden rounded-2xl shadow-lg sm:min-h-[200px] lg:min-h-[220px]">
          <Image
            src="/images/hero-banner.png"
            alt=""
            fill
            priority
            className="object-cover object-[98%_50%] scale-[1.35] sm:scale-[1.15] sm:object-[94%_center] lg:scale-110 lg:object-[88%_center]"
            sizes="(max-width: 1024px) 100vw, 560px"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628] from-55% via-[#0a1628]/92 via-72% to-[#0a1628]/25 sm:from-50% sm:via-70% lg:from-48% lg:via-68%" />
          <div className="relative z-10 flex min-h-[148px] flex-col justify-center p-4 sm:min-h-[200px] sm:p-6 lg:min-h-[220px] lg:p-8">
            <h1 className="max-w-xs text-[1.625rem] font-extrabold leading-tight text-white sm:text-[1.75rem] lg:text-3xl">
              Create Your Token
            </h1>
            <p className="mt-1.5 max-w-xs text-[0.9375rem] font-medium leading-snug text-white/90 sm:mt-2 sm:text-base">
              Launch and grow your community on OPN.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap">
              <Button asChild size="default" className="h-10 bg-primary px-6 hover:bg-primary/90 sm:h-11">
                <Link href="/create">
                  Create Token <Rocket className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:h-11"
              >
                <Link href="/discover?section=new">Explore Tokens</Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                className="h-10 bg-white text-[#0a1628] hover:bg-white/90 sm:h-11"
              >
                <Link href="/app">Launch App</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:pt-1">
          <LandingTrendingPreview />
        </div>
      </div>
    </section>
  );
}
