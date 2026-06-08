import { redirect } from "next/navigation";

/** /admin redirects to dashboard (login gate is client-side). */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
