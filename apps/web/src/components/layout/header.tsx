"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton } from "@/components/auth/sign-in-button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { DexNavDropdown } from "@/components/layout/swap-nav-dropdown";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

const nav = [
  { href: "/discover", label: "Discover" },
  { href: "/create", label: "Create Token" },
] as const;

function isNavActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`) || (href.startsWith("/discover") && pathname === "/discover");
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 lg:px-8">
        <FansPumpLogo size="sm" />

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isNavActive(pathname, item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              {isNavActive(pathname, item.href) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-1 -bottom-[17px] h-0.5 bg-primary"
                />
              )}
            </Link>
          ))}
          <DexNavDropdown />
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <MobileNavDrawer />
          <ThemeToggle />
          <SignInButton showBalance chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
