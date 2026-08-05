"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { handleAppNavigation } from "@/lib/navigation/app-navigate";
import { DEX_HOME, isDexPath } from "@/lib/navigation/swap-nav";

const MOBILE_MENU_EXCLUDE = new Set(["home", "discover", "create", "dex"]);

type BottomTab = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  action?: "menu";
};

const BOTTOM_TABS: BottomTab[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "discover", href: "/discover?section=all", label: "Discover", icon: Compass },
  { id: "dex", href: DEX_HOME, label: "DEX", icon: ArrowLeftRight },
  { id: "create", href: "/create", label: "Create", icon: Rocket },
  { id: "menu", href: "#", label: "Menu", icon: Menu, action: "menu" },
];

function isTabActive(tab: BottomTab, pathname: string): boolean {
  if (tab.id === "dex") return isDexPath(pathname);
  const base = tab.href.split("?")[0];
  if (tab.id === "home") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function MobileBottomNavInner() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleMenuClick() {
    setMenuOpen(true);
  }

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[240] bg-black/40 max-md:block hidden"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {menuOpen && (
        <aside
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[245] flex max-h-[min(70vh,32rem)] flex-col rounded-t-2xl border border-border bg-background shadow-2xl max-md:flex hidden"
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
              collapsed={false}
              compact
              excludeNavIds={MOBILE_MENU_EXCLUDE}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </aside>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-[250] border-t border-border bg-background/95 backdrop-blur-md max-md:block hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid h-14 max-w-lg grid-cols-5">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;

            if (tab.action === "menu") {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={handleMenuClick}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                    menuOpen ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-expanded={menuOpen}
                >
                  <Menu
                    className="h-5 w-5 shrink-0"
                    strokeWidth={menuOpen ? 2.25 : 2}
                  />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            }

            const active = isTabActive(tab, pathname);

            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch
                onClick={(e) => handleAppNavigation(e, tab.href, router)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                <span className="truncate">{tab.label}</span>
              </Link>
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
      <MobileBottomNavInner />
    </div>
  );
}

/** Bottom padding for main content above the mobile nav bar (phones only). */
export const MOBILE_BOTTOM_NAV_PADDING = "max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]";
