import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-2">Admin</h1>
      <p className="text-muted-foreground mb-8">
        Platform curation and factory controls for authorized FansPump operators.
      </p>
      <AdminDashboard />
    </div>
  );
}
