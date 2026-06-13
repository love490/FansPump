"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { DexNavDropdown } from "@/components/layout/dex-nav-dropdown";

const nav = [
  { href: "/discover?section=trending", label: "Explore" },
  { href: "/leaderboard", label: "Explore Tokens" },
  { href: "/create", label: "Create Token" },
] as const;

export function LandingHeader() {
  const pathname = usePathname();

  const linkClass = (href: string, mobile = false) =>
    cn(
      mobile
        ? "shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] font-medium sm:px-2.5 sm:text-xs"
        : "rounded-md px-3 py-2 text-sm font-medium",
      "transition-colors",
      pathname === href.split("?")[0] || pathname.startsWith(href.split("?")[0] + "/")
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8 xl:px-10">
        <FansPumpLogo size="sm" href="/" className="shrink-0" />

        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href, true)}>
              {item.label}
            </Link>
          ))}
          <DexNavDropdown compact />
        </nav>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
          <DexNavDropdown />
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
        </div>
      </div>
    </header>
  );
}
