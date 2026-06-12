"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { AdminProvider } from "@/components/admin/admin-context";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <AdminProvider>
      {isLogin ? (
        children
      ) : (
        <Suspense fallback={null}>
          <AdminShell>{children}</AdminShell>
        </Suspense>
      )}
    </AdminProvider>
  );
}
