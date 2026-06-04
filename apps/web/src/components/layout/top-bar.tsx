"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "@/components/theme-toggle";
import { TokenSearch } from "@/components/layout/token-search";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <TokenSearch />
        <ThemeToggle />
        <ConnectButton showBalance chainStatus="icon" accountStatus="address" />
      </div>
    </header>
  );
}
