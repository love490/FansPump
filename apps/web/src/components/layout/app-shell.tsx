"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { Footer } from "@/components/layout/footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 p-4 pt-16 lg:p-6 lg:pt-6">
            <div className="mx-auto w-full lg:max-w-[calc(100vw-16rem-3rem)]">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
