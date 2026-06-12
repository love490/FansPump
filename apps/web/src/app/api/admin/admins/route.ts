import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { AdminRole } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import {
  createAdminAccount,
  listAdmins,
  setAdminRoleById,
} from "@/lib/admin/roles";
import {
  adminEmailSchema,
  adminPasswordSchema,
  hashAdminPassword,
  normalizeAdminEmail,
} from "@/lib/admin/password";

const createSchema = z.object({
  email: adminEmailSchema,
  password: adminPasswordSchema,
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR"]),
});

const patchSchema = z.object({
  adminId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR"]),
});

export async function GET(request: NextRequest) {
  try {
    const { role, email } = await requirePermission(request, "roles", "GET");
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }
    const admins = await listAdmins();
    return NextResponse.json({ admins });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load admins" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePermission(request, "roles", "POST");
    if (ctx.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }

    const body = createSchema.parse(ctx.parsedBody);
    const email = normalizeAdminEmail(body.email);
    const passwordHash = await hashAdminPassword(body.password);
    const admin = await createAdminAccount(email, passwordHash, body.role as AdminRole);

    await logAdminAction(ctx.email, "ADMIN_CREATED", { targetEmail: email, role: body.role }, request, ctx.admin.id);

    return NextResponse.json({ ok: true, admin });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "An admin with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
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
