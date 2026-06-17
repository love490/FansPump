"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Compass,
  Home,
  Menu,
  Rocket,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppNavMenuContent } from "@/components/layout/sidebar";
import { DexSubNav } from "@/components/layout/dex-sub-nav";
import { DEX_LABEL, isDexPath } from "@/lib/navigation/swap-nav";

const MOBILE_MENU_EXCLUDE = new Set(["home", "discover", "create", "dex"]);

type BottomTab = {
  id: string;
  label: string;
  href?: string;
  icon: typeof Home;
  action?: "dex" | "menu";
};

const BOTTOM_TABS: BottomTab[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "discover", href: "/discover?section=all", label: "Discover", icon: Compass },
  { id: "dex", label: DEX_LABEL, icon: ArrowLeftRight, action: "dex" },
  { id: "create", href: "/create", label: "Create", icon: Rocket },
  { id: "menu", label: "Menu", icon: Menu, action: "menu" },
];

function isTabActive(tab: BottomTab, pathname: string): boolean {
  if (tab.action === "dex") return isDexPath(pathname);
  if (!tab.href) return false;
  const base = tab.href.split("?")[0];
  if (tab.id === "home") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function MobileBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dexOpen, setDexOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setDexOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!dexOpen && !menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDexOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [dexOpen, menuOpen]);

  function handleTabClick(tab: BottomTab) {
    if (tab.action === "dex") {
      setMenuOpen(false);
      setDexOpen((open) => !open);
      return;
    }
    if (tab.action === "menu") {
      setDexOpen(false);
      setMenuOpen(true);
    }
  }

  return (
    <>
      {(dexOpen || menuOpen) && (
        <button
          type="button"
          className="fixed inset-0 z-[90] bg-black/40 max-md:block hidden"
          aria-label="Close navigation"
          onClick={() => {
            setDexOpen(false);
            setMenuOpen(false);
          }}
        />
      )}

      {dexOpen && (
        <div
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[95] mx-3 max-md:block hidden"
          role="dialog"
          aria-label={`${DEX_LABEL} navigation`}
        >
          <div className="mb-2 flex items-center justify-end px-1">
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setDexOpen(false)}
              aria-label={`Close ${DEX_LABEL} menu`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DexSubNav onNavigate={() => setDexOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <aside
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[95] flex max-h-[min(70vh,32rem)] flex-col rounded-t-2xl border border-border bg-background shadow-2xl max-md:flex hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <AppNavMenuContent
              pathname={pathname}
              searchParams={searchParams}
              collapsed={false}
              compact
              excludeNavIds={MOBILE_MENU_EXCLUDE}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </aside>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 backdrop-blur-md max-md:block hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid h-14 max-w-lg grid-cols-5">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab, pathname) || (tab.action === "menu" && menuOpen);

            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                  <span className="truncate">{tab.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                  active || (tab.action === "dex" && dexOpen)
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
                aria-expanded={tab.action === "dex" ? dexOpen : tab.action === "menu" ? menuOpen : undefined}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  strokeWidth={active || (tab.action === "dex" && dexOpen) ? 2.25 : 2}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/** Phones only (<768px). iPad and desktop use the sidebar instead. */
export function MobileBottomNav() {
  return (
    <div className="md:hidden">
      <Suspense fallback={null}>
        <MobileBottomNavInner />
      </Suspense>
    </div>
  );
}

/** Bottom padding for main content above the mobile nav bar (phones only). */
export const MOBILE_BOTTOM_NAV_PADDING = "max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]";
