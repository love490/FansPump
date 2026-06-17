"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const SWAP_TABS = [
  { id: "swap", label: "Swap", href: "/swap" },
  { id: "advanced", label: "Advanced", href: "/swap?tab=advanced" },
] as const;

export type SwapViewTab = (typeof SWAP_TABS)[number]["id"];

export function getSwapViewTab(searchParams: URLSearchParams): SwapViewTab {
  return searchParams.get("tab") === "advanced" ? "advanced" : "swap";
}

type SwapModeSubNavProps = {
  className?: string;
};

export function SwapModeSubNav({ className }: SwapModeSubNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = getSwapViewTab(searchParams);

  if (pathname !== "/swap") return null;

  return (
    <nav
      className={cn(
        "flex items-center justify-center gap-x-10 border-b border-border pb-3",
        className
      )}
      aria-label="Swap modes"
    >
      {SWAP_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "text-sm font-bold transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
