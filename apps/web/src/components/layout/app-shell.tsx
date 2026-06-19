"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav, MOBILE_BOTTOM_NAV_PADDING } from "@/components/layout/mobile-bottom-nav";
import { cn } from "@/lib/utils";
import { isDexPath } from "@/lib/navigation/swap-nav";
import { DexSubNav } from "@/components/layout/dex-sub-nav";

function MainColumn({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const showDexSubNav = isDexPath(pathname ?? "");

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar />
      <div className={cn("flex flex-1 flex-col", MOBILE_BOTTOM_NAV_PADDING)}>
        <main className="flex-1 p-4 lg:p-6">
          <div
            className={cn(
              "mx-auto w-full transition-[max-width] duration-300 ease-in-out motion-reduce:transition-none",
              collapsed ? "lg:max-w-[calc(100vw-4.5rem-3rem)]" : "lg:max-w-[calc(100vw-18rem-3rem)]"
            )}
          >
            {showDexSubNav && (
              <div className="mb-6 flex justify-center px-0 sm:px-4 lg:px-8">
                <DexSubNav className="w-full max-w-3xl" />
              </div>
            )}
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function ShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [trustScanStandalone, setTrustScanStandalone] = useState(false);

  useEffect(() => {
    setTrustScanStandalone(window.location.hostname.startsWith("trustscan."));
  }, []);

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }
  if (pathname === "/trustscan" && trustScanStandalone) {
    return <>{children}</>;
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <MainColumn>{children}</MainColumn>
        <Suspense fallback={null}>
          <MobileBottomNav />
        </Suspense>
      </div>
    </SidebarProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <ShellRouter>{children}</ShellRouter>;
}
