"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/admin-context";
import { AdminSectionRouter } from "@/components/admin/admin-sections";

function DashboardContent() {
  const { authorized, requires2FA, sessionChecking } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") ?? "overview";

  useEffect(() => {
    if (sessionChecking) return;
    if (!authorized || requires2FA) {
      router.replace("/admin/login");
    }
  }, [authorized, requires2FA, router, sessionChecking]);

  if (sessionChecking || !authorized) {
    return <p className="text-muted-foreground">Loading admin dashboard...</p>;
  }

  return <AdminSectionRouter section={section} />;
}

export function AdminDashboard() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
