"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AdminNavLink } from "@/components/layout/admin-nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";

const nav = [
  { href: "/discover", label: "Discover" },
  { href: "/create", label: "Create Token" },
  { href: "/swap", label: "Swap" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/verify", label: "Verify" },
  { href: "/docs", label: "Docs" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <FansPumpLogo size="sm" />

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              {(pathname === item.href || pathname.startsWith(item.href + "/")) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-1 -bottom-[17px] h-0.5 bg-primary"
                />
              )}
            </Link>
          ))}
          <AdminNavLink className="rounded-md px-3 py-2" />
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ConnectButton showBalance chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
