import { Suspense } from "react";
import { AdminLogin } from "@/components/admin/admin-login";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  );
}
