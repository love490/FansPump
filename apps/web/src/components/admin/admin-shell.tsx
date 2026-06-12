"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/components/admin/admin-context";
import { Button } from "@/components/ui/button";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { LogIn, LogOut, Shield } from "lucide-react";
import type { AdminPermission } from "@/lib/admin/types";

const NAV: { id: string; label: string; perm: AdminPermission }[] = [
  { id: "overview", label: "Overview", perm: "overview" },
  { id: "creation-fees", label: "Creation Fees", perm: "creation_fees" },
  { id: "trading-fees", label: "Trading Fees", perm: "trading_fees" },
  { id: "treasury", label: "Treasury", perm: "treasury" },
  { id: "verification", label: "Verification", perm: "verification" },
  { id: "categories", label: "Categories", perm: "categories" },
  { id: "announcements", label: "Announcements", perm: "announcements" },
  { id: "staking", label: "Staking Tiers", perm: "staking" },
  { id: "trust-panel", label: "Trust Panel", perm: "trust_panel" },
  { id: "v2-platform", label: "V2 Platform", perm: "v2_platform" },
  { id: "discovery", label: "Discovery", perm: "discovery" },
  { id: "analytics", label: "Analytics", perm: "analytics" },
  { id: "creator-earnings", label: "Creator Earnings", perm: "creator_earnings" },
  { id: "pool-share", label: "Pool Share", perm: "pool_share" },
  { id: "bridge", label: "Bridge (Future)", perm: "bridge" },
  { id: "security", label: "Protocol Security", perm: "security" },
  { id: "system", label: "System", perm: "system" },
  { id: "factory", label: "Factory (On-chain)", perm: "factory" },
  { id: "account", label: "Account & 2FA", perm: "overview" },
  { id: "activity-logs", label: "Activity Logs", perm: "activity_logs" },
  { id: "roles", label: "Admin Roles", perm: "roles" },
];

function isSignInPath(pathname: string) {
  return pathname === "/admin/login" || pathname === "/admin/signin";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") ?? "overview";
  const { email, role, authorized, signOut, can } = useAdmin();
  const onSignInPage = isSignInPath(pathname ?? "");

  const navLinkClass = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/" className="mb-4 flex items-center gap-2">
            <FansPumpLogo showText size="sm" />
          </Link>
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> Admin
          </p>

          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            <Link href="/admin/login" className={navLinkClass(onSignInPage)}>
              <LogIn className="h-4 w-4 shrink-0" />
              Sign in
            </Link>

            {authorized &&
              NAV.filter((n) => can(n.perm)).map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/dashboard?section=${item.id}`}
                  className={navLinkClass(!onSignInPage && section === item.id)}
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="mt-4 border-t border-border pt-4">
            {authorized ? (
              <>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
                <p className="text-xs text-muted-foreground">{role?.replace("_", " ")}</p>
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => void signOut()}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Platform admin access only. Use Sign in above with your admin email and password.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile: sign-in shortcut when sidebar is hidden */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <FansPumpLogo showText size="sm" />
          </Link>
          {!authorized && (
            <Button asChild size="sm" variant={onSignInPage ? "default" : "outline"}>
              <Link href="/admin/login">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </Button>
          )}
          {authorized && (
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          )}
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
