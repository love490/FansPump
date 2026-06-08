"use client";

import { Suspense } from "react";
import { AdminProvider } from "@/components/admin/admin-context";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <Suspense fallback={null}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </AdminProvider>
  );
}
