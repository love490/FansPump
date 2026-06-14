"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

function MainColumn({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar />
      <main className="flex-1 p-4 pt-16 lg:p-6 lg:pt-6">
        <div
          className={cn(
            "mx-auto w-full transition-[max-width] duration-300 ease-in-out motion-reduce:transition-none",
            collapsed ? "lg:max-w-[calc(100vw-4.5rem-3rem)]" : "lg:max-w-[calc(100vw-18rem-3rem)]"
          )}
        >
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <MainColumn>{children}</MainColumn>
      </div>
    </SidebarProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return <ShellRouter>{children}</ShellRouter>;
}
