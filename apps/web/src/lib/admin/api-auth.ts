import type { NextRequest } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import type { AdminPermission } from "@/lib/admin/types";
import {
  getSessionFromRequest,
  validateCsrf,
  type AdminSessionContext,
} from "@/lib/admin/server-session";
import { roleHasPermission } from "@/lib/admin/roles";

async function requireSession(
  request: NextRequest,
  options: { allowPending2FA?: boolean; requireCsrf?: boolean } = {}
): Promise<AdminSessionContext & { token: string }> {
  const ctx = await getSessionFromRequest(request);
  if (!ctx) {
    throw new AdminAuthError("Unauthorized — sign in required");
  }
  if (ctx.session.pending2FA && !options.allowPending2FA) {
    throw new AdminAuthError("Two-factor authentication required");
  }
  if (options.requireCsrf && !validateCsrf(request, ctx.session)) {
    throw new AdminAuthError("Invalid CSRF token");
  }
  return ctx;
}

export async function requireAdminSession(request: NextRequest) {
  const ctx = await requireSession(request);
  return {
    admin: ctx.admin,
    email: ctx.admin.email,
    role: ctx.admin.role,
    csrfToken: ctx.csrfToken,
    token: ctx.token,
  };
}

export async function requireAdminSessionWithCsrf(request: NextRequest) {
  return requireSession(request, { requireCsrf: true });
}

export async function requirePending2FASession(request: NextRequest) {
  const ctx = await requireSession(request, { allowPending2FA: true });
  if (!ctx.session.pending2FA) {
    throw new AdminAuthError("Two-factor step not pending");
  }
  return ctx;
}

export async function requirePermission(
  request: NextRequest,
  permission: AdminPermission,
  method: "GET"
): Promise<{
  admin: AdminSessionContext["admin"];
  email: string;
  role: AdminSessionContext["admin"]["role"];
  csrfToken: string;
}>;
export async function requirePermission(
  request: NextRequest,
  permission: AdminPermission,
  method: "PATCH" | "POST"
): Promise<{
  admin: AdminSessionContext["admin"];
  email: string;
  role: AdminSessionContext["admin"]["role"];
  csrfToken: string;
  parsedBody: Record<string, unknown>;
}>;
export async function requirePermission(
  request: NextRequest,
  permission: AdminPermission,
  method: "GET" | "PATCH" | "POST" = "GET"
) {
  const ctx =
    method === "GET"
      ? await requireSession(request)
      : await requireSession(request, { requireCsrf: true });

  const base = {
    admin: ctx.admin,
    email: ctx.admin.email,
    role: ctx.admin.role,
    csrfToken: ctx.csrfToken,
  };

  if (method === "GET") {
    if (!roleHasPermission(ctx.admin.role, permission)) {
      throw new AdminAuthError("Insufficient permissions");
    }
    return base;
  }

  const parsedBody = (await request.json()) as Record<string, unknown>;
  if (
    !roleHasPermission(ctx.admin.role, permission) &&
    !roleHasPermission(ctx.admin.role, "write")
  ) {
    throw new AdminAuthError("Insufficient permissions");
  }
  return { ...base, parsedBody };
}

/** @deprecated Wallet signature auth removed — use requirePermission */
export async function requireAdminFromQuery(request: NextRequest) {
  return requireAdminSession(request);
}

/** @deprecated Wallet signature auth removed */
export async function requireAdminFromBody(body: unknown) {
  void body;
  throw new AdminAuthError("Wallet admin auth is no longer supported");
}

/** @deprecated */
export async function requireAdminGet(request: NextRequest, permission: AdminPermission) {
  return requirePermission(request, permission, "GET");
}

/** @deprecated */
export async function requireAdminPatch(request: NextRequest, permission: AdminPermission) {
  return requirePermission(request, permission, "PATCH");
}
