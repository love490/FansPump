import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { AdminRole } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { listAdmins, setAdminRoleById } from "@/lib/admin/roles";

const patchSchema = z.object({
  adminId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT", "VIEWER"]),
});

export async function GET(request: NextRequest) {
  try {
    const { role } = await requirePermission(request, "roles", "GET");
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }
    const admins = await listAdmins();
    return NextResponse.json({ admins });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load roles" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requirePermission(request, "roles", "PATCH");
    if (ctx.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }
    const { adminId, role } = patchSchema.parse(ctx.parsedBody);
    await setAdminRoleById(adminId, role as AdminRole);
    await logAdminAction(ctx.email, "ROLE_CHANGE", { adminId, role }, request, ctx.admin.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
