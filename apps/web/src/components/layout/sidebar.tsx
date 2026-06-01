"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Rocket,
  Compass,
  Star,
  HelpCircle,
  BookOpen,
  LayoutDashboard,
  Coins,
  Bookmark,
  Users,
  ArrowLeftRight,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FansPumpBrand } from "@/components/brand/fans-pump-brand";
import { AdminNavLink } from "@/components/layout/admin-nav-link";
import { useSidebar } from "@/components/layout/sidebar-context";

const platformLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/create", label: "Create Token", icon: Rocket },
  { href: "/discover", label: "Explore", icon: Compass },
  { href: "/discover?section=featured", label: "Featured", icon: Star },
  { href: "/docs/how-it-works", label: "How It Works", icon: HelpCircle },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
];

const userLinks = [
  { href: "/watchlist", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover", label: "My Tokens", icon: Coins },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/verify", label: "Following", icon: Users },
];

function isNavLinkActive(pathname: string, searchParams: URLSearchParams, href: string) {
  const [path, query] = href.split("?");
  if (query) {
    if (pathname !== path) return false;
    const expected = new URLSearchParams(query);
    for (const [key, value] of expected.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }
  return pathname === path;
}

function NavSection({
  title,
  links,
  pathname,
  searchParams,
  onNavigate,
  showAdmin,
  collapsed,
}: {
  title?: string;
  links: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate?: () => void;
  showAdmin?: boolean;
  collapsed?: boolean;
}) {
  return (
    <div className="mb-6">
      {title && !collapsed && (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      <nav className="space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : isNavLinkActive(pathname, searchParams, href);
          return (
            <Link
              key={href + label}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
        {showAdmin && !collapsed && (
          <div className="px-3">
            <AdminNavLink className="flex items-center gap-3 rounded-lg px-0 py-2" />
          </div>
        )}
      </nav>
    </div>
  );
}

function SidebarContent({
  pathname,
  searchParams,
  onNavigate,
  collapsed,
  onToggle,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "mb-6",
          collapsed ? "flex flex-col items-center gap-2 px-1" : "flex items-start justify-between gap-2 px-2"
        )}
      >
        <FansPumpBrand collapsed={collapsed} className={collapsed ? undefined : "min-w-0 flex-1"} />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "mt-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
      <NavSection
        links={platformLinks}
        pathname={pathname}
        searchParams={searchParams}
        onNavigate={onNavigate}
        showAdmin
        collapsed={collapsed}
      />
      <NavSection
        title="User"
        links={userLinks}
        pathname={pathname}
        searchParams={searchParams}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
      <div className="mb-6">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
        )}
        <Link
          href="/verify"
          onClick={onNavigate}
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center rounded-lg py-2 text-sm text-muted-foreground hover:bg-muted",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          <Settings className="h-4 w-4" /> {!collapsed && "Settings"}
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggleSidebar } = useSidebar();

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "fixed left-4 top-4 z-50 rounded-lg border bg-background p-2.5 shadow-sm lg:hidden",
          mobileOpen && "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        aria-hidden={mobileOpen}
        tabIndex={mobileOpen ? -1 : 0}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(18rem,85vw)] flex-col border-r bg-background shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-muted active:bg-muted"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <SidebarContent
                pathname={pathname}
                searchParams={searchParams}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </div>
      )}

      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-card/50 transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen overflow-y-auto p-4">
          <SidebarContent
            pathname={pathname}
            searchParams={searchParams}
            collapsed={collapsed}
            onToggle={toggleSidebar}
          />
        </div>
      </aside>
    </>
  );
}
