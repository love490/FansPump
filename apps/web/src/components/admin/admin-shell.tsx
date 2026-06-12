"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/components/admin/admin-context";
import { Button } from "@/components/ui/button";
import { FansPumpLogo } from "@/components/brand/fans-pump-logo";
import { LogOut, Shield } from "lucide-react";
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") ?? "overview";
  const { email, role, signOut, can } = useAdmin();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

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
            {NAV.filter((n) => can(n.perm)).map((item) => (
              <Link
                key={item.id}
                href={`/admin/dashboard?section=${item.id}`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  section === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-border pt-4">
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <p className="text-xs text-muted-foreground">{role?.replace("_", " ")}</p>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
