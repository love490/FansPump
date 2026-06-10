"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "@/components/theme-toggle";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";

const navLinkClass = "hover:text-foreground";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8 xl:px-10">
        <FansPumpLogo size="sm" href="/" />

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex lg:gap-6">
          <Link href="#features" className={navLinkClass}>
            Features
          </Link>
          <Link href="/create" className={navLinkClass}>
            Create Token
          </Link>
          <Link href="/swap" className={navLinkClass}>
            Swap
          </Link>
          <Link href="/app" className={navLinkClass}>
            Launch App
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
        </div>
      </div>
    </header>
  );
}
