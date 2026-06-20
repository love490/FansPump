"use client";

import { SignInButton } from "@/components/auth/sign-in-button";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TokenSearch } from "@/components/layout/token-search";
import { BackNavButton } from "@/components/layout/back-nav-button";
import { usePathname } from "next/navigation";

const HIDE_BACK_PATHS = new Set(["/"]);

export function TopBar() {
  const pathname = usePathname();
  const showBack = Boolean(pathname && !HIDE_BACK_PATHS.has(pathname));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
        <div className="flex min-w-0 items-center md:gap-1.5">
          <BackNavButton className="hidden md:inline-flex" />
          <FansPumpLogo size="sm" showText={false} className="shrink-0 md:hidden" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <TokenSearch />
          <ThemeToggle />
          <SignInButton showBalance chainStatus="icon" accountStatus="address" />
        </div>
      </div>
      {showBack && (
        <div className="flex items-center border-t border-border/60 px-3 py-1 md:hidden">
          <BackNavButton />
        </div>
      )}
    </header>
  );
}
