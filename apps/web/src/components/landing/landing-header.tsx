"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton } from "@/components/auth/sign-in-button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { DexNavDropdown } from "@/components/layout/swap-nav-dropdown";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

const nav = [
  { href: "/discover", label: "Discover" },
  { href: "/create", label: "Create Token" },
] as const;

export function LandingHeader() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      pathname === href.split("?")[0] || pathname.startsWith(href.split("?")[0] + "/")
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8 xl:px-10">
        <FansPumpLogo size="sm" href="/" className="shrink-0" />

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
          <DexNavDropdown />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <MobileNavDrawer />
          <ThemeToggle />
          <SignInButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
        </div>
      </div>
    </header>
  );
}
