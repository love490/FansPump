"use client";

import Link from "next/link";
import Image from "next/image";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

const heroBtnBase =
  "h-7 shrink-0 rounded-md px-2 text-[10px] font-semibold leading-none sm:h-11 sm:px-6 sm:text-sm sm:leading-normal";

export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-8 lg:pt-10">
      <div className="relative min-h-[118px] overflow-hidden rounded-2xl shadow-lg sm:min-h-[200px] lg:min-h-[220px]">
        <Image
          src="/images/hero-banner.png"
          alt=""
          fill
          priority
          className="object-cover object-[98%_50%] scale-[1.2] sm:scale-[1.15] sm:object-[94%_center] lg:scale-110 lg:object-[88%_center]"
          sizes="(max-width: 1024px) 100vw, 1152px"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628] from-[38%] via-[#0a1628]/80 via-[52%] to-transparent sm:from-50% sm:via-70% sm:to-[#0a1628]/25 lg:from-48% lg:via-68%" />
        <div className="relative z-10 flex min-h-[118px] flex-col justify-center p-3 sm:min-h-[200px] sm:p-6 lg:min-h-[220px] lg:p-8">
          <h1 className="max-w-[11rem] text-lg font-extrabold leading-tight text-white sm:max-w-xs sm:text-[1.75rem] lg:text-3xl">
            Create Your Token
          </h1>
          <p className="mt-0.5 max-w-[11rem] text-[11px] font-medium leading-snug text-white/90 sm:mt-2 sm:max-w-xs sm:text-base">
            Launch and grow your community on OPN.
          </p>
          <div className="mt-2 flex flex-row flex-nowrap items-center gap-1 sm:mt-4 sm:flex-wrap sm:gap-2">
            <Button asChild className={`${heroBtnBase} bg-primary hover:bg-primary/90`}>
              <Link href="/create" className="inline-flex items-center gap-0.5 sm:gap-2">
                <span className="whitespace-nowrap">Create Token</span>
                <Rocket className="h-2.5 w-2.5 shrink-0 sm:h-4 sm:w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={`${heroBtnBase} border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white`}
            >
              <Link href="/discover?section=new" className="whitespace-nowrap">
                Explore Tokens
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className={`${heroBtnBase} bg-white text-[#0a1628] hover:bg-white/90`}
            >
              <Link href="/home" className="whitespace-nowrap">
                Launch App
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
