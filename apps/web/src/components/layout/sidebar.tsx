"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FansPumpTagline } from "@/components/brand/fans-pump-brand";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { SidebarWallet } from "@/components/layout/sidebar-wallet";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  platformLinks,
  userLinks,
  settingsLink,
  accountFooterLinks,
  isSidebarNavActive,
  type SidebarNavItem,
} from "@/components/layout/sidebar-nav";
import { isDexPath } from "@/lib/navigation/swap-nav";

function NavLink({
  link,
  pathname,
  searchParams,
  onNavigate,
  collapsed,
  nested,
}: {
  link: SidebarNavItem;
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate?: () => void;
  collapsed?: boolean;
  nested?: boolean;
}) {
  const { id, href, label, icon: Icon } = link;
  const active = isSidebarNavActive(id, pathname, searchParams);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-2" : cn("gap-3", nested ? "pl-9 pr-3" : "px-3"),
        nested && "text-[13px]",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("shrink-0", nested ? "h-3.5 w-3.5" : "h-4 w-4")} />
      {!collapsed && label}
    </Link>
  );
}

function NavItemWithChildren({
  link,
  pathname,
  searchParams,
  onNavigate,
  collapsed,
}: {
  link: SidebarNavItem;
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const sectionOpenDefault = link.id === "dex" ? isDexPath(pathname) : false;
  const [open, setOpen] = useState(sectionOpenDefault);
  const parentActive = isSidebarNavActive(link.id, pathname, searchParams);

  useEffect(() => {
    if (sectionOpenDefault) setOpen(true);
  }, [sectionOpenDefault]);

  if (!link.children?.length) {
    return (
      <NavLink
        link={link}
        pathname={pathname}
        searchParams={searchParams}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
    );
  }

  if (collapsed) {
    return (
      <NavLink
        link={link}
        pathname={pathname}
        searchParams={searchParams}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href={link.href}
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            parentActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <link.icon className="h-4 w-4 shrink-0" />
          {link.label}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${link.label} menu`}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <div className="space-y-0.5 border-l border-border/60 ml-5 pl-1">
          {link.children.map((child) => (
            <NavLink
              key={child.id}
              link={child}
              pathname={pathname}
              searchParams={searchParams}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavSection({
  title,
  links,
  pathname,
  searchParams,
  onNavigate,
  collapsed,
}: {
  title?: string;
  links: SidebarNavItem[];
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate?: () => void;
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
        {links.map((link) => (
          <NavItemWithChildren
            key={link.id}
            link={link}
            pathname={pathname}
            searchParams={searchParams}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
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
  compact,
  excludeNavIds,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Hide logo/tagline block (mobile header drawer). */
  compact?: boolean;
  /** Omit nav items already shown elsewhere (e.g. mobile bottom bar). */
  excludeNavIds?: Set<string>;
}) {
  const settingsActive = isSidebarNavActive(settingsLink.id, pathname, searchParams);
  const isExpanded = collapsed !== true;
  const platformNavLinks = excludeNavIds
    ? platformLinks.filter((link) => !excludeNavIds.has(link.id))
    : platformLinks;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!compact && (
      <div
        className={cn(
          "mb-3 shrink-0 overflow-visible border-b border-border/50 pb-3",
          isExpanded ? "px-0.5" : "px-1"
        )}
      >
        {isExpanded ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <FansPumpLogo showText size="md" className="min-w-0 flex-1 pr-1" />
              {onToggle && <SidebarToggle collapsed={false} onClick={onToggle} className="mt-0.5 shrink-0" />}
            </div>
            <FansPumpTagline className="mt-2" />
          </>
        ) : (
          <div className="flex h-10 items-center justify-center">
            {onToggle && <SidebarToggle collapsed onClick={onToggle} />}
          </div>
        )}
      </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NavSection
          links={platformNavLinks}
          pathname={pathname}
          searchParams={searchParams}
          onNavigate={onNavigate}
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
        <div className="mb-4 space-y-0.5">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </p>
          )}
          <Link
            href={settingsLink.href}
            onClick={onNavigate}
            title={collapsed ? settingsLink.label : undefined}
            className={cn(
              "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
              settingsActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <settingsLink.icon className="h-4 w-4 shrink-0" />
            {!collapsed && settingsLink.label}
          </Link>
          {accountFooterLinks.map((link) => (
            <NavLink
              key={link.id}
              link={link}
              pathname={pathname}
              searchParams={searchParams}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </div>
      </div>

      <div className={cn("shrink-0 border-t border-border pt-4", collapsed ? "px-1" : "px-2")}>
        {!collapsed && (
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wallet
          </p>
        )}
        <SidebarWallet collapsed={collapsed} />
      </div>
    </div>
  );
}

/** Full app navigation — used in sidebar and mobile header drawer. */
export function AppNavMenuContent(props: {
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
  compact?: boolean;
  excludeNavIds?: Set<string>;
}) {
  return <SidebarContent {...props} />;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { collapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-border bg-card/50 lg:block",
        "transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
        collapsed ? "w-[4.5rem] overflow-hidden" : "w-72 overflow-visible"
      )}
    >
      <div className={cn("sticky top-0 h-screen", collapsed ? "px-2 py-3" : "p-4")}>
        <SidebarContent
          pathname={pathname}
          searchParams={searchParams}
          collapsed={collapsed}
          onToggle={toggleSidebar}
        />
      </div>
    </aside>
  );
}
