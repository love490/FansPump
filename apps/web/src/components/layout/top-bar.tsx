"use client";

import { SignInButton } from "@/components/auth/sign-in-button";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TokenSearch } from "@/components/layout/token-search";
import { BackNavButton } from "@/components/layout/back-nav-button";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex min-w-0 items-center gap-1.5">
        <BackNavButton />
        <FansPumpLogo size="sm" showText={false} className="shrink-0 lg:hidden" />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <TokenSearch />
        <ThemeToggle />
        <SignInButton showBalance chainStatus="icon" accountStatus="address" />
      </div>
    </header>
  );
}
