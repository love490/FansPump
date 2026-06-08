import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { AdminRole } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminFromBody, requirePermission } from "@/lib/admin/api-auth";
import { roleHasPermission } from "@/lib/admin/roles";
import { logAdminAction } from "@/lib/admin/audit-log";
import { listAdminProfiles, setAdminRole } from "@/lib/admin/roles";

const patchSchema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  targetWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  role: z.enum(["SUPER_ADMIN", "MODERATOR", "SUPPORT", "VIEWER"]),
});

export async function GET(request: NextRequest) {
  try {
    const { role } = await requirePermission(request, "roles", "GET");
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }
    const admins = await listAdminProfiles();
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
    const body = await request.json();
    const { wallet, role: callerRole } = await requireAdminFromBody(body);
    if (!roleHasPermission(callerRole, "roles")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    if (callerRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super admin only" }, { status: 403 });
    }
    const { targetWallet, role } = patchSchema.parse(body);
    await setAdminRole(targetWallet, role as AdminRole, wallet);
    await logAdminAction(wallet, "ROLE_CHANGE", { targetWallet, role }, request);
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
