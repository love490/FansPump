import { redirect } from "next/navigation";

/** /admin → email/password login (not wallet). */
export default function AdminIndexPage() {
  redirect("/admin/login");
}
