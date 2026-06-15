import type { Request } from "express";
import { AdminAuthError } from "@/lib/admin-auth";
import type { AdminPermission } from "@/lib/admin/types";
import { roleHasPermission } from "@/lib/admin/roles";
import {
  getSessionFromRequest,
  validateCsrf,
  type AdminSessionContext,
} from "./express-session";

async function requireSession(
  req: Request,
  options: { allowPending2FA?: boolean; requireCsrf?: boolean } = {}
): Promise<AdminSessionContext & { token: string }> {
  const ctx = await getSessionFromRequest(req);
  if (!ctx) {
    throw new AdminAuthError("Unauthorized — sign in required");
  }
  if (ctx.session.pending2FA && !options.allowPending2FA) {
    throw new AdminAuthError("Two-factor authentication required");
  }
  if (options.requireCsrf && !validateCsrf(req, ctx.session)) {
    throw new AdminAuthError("Invalid CSRF token");
  }
  return ctx;
}

export async function requireAdminSession(req: Request) {
  const ctx = await requireSession(req);
  return {
    admin: ctx.admin,
    email: ctx.admin.email,
    role: ctx.admin.role,
    csrfToken: ctx.csrfToken,
    token: ctx.token,
  };
}

export async function requireAdminSessionWithCsrf(req: Request) {
  return requireSession(req, { requireCsrf: true });
}

export async function requirePending2FASession(req: Request) {
  const ctx = await requireSession(req, { allowPending2FA: true });
  if (!ctx.session.pending2FA) {
    throw new AdminAuthError("Two-factor step not pending");
  }
  return ctx;
}

export async function requirePermission(
  req: Request,
  permission: AdminPermission,
  method: "GET"
): Promise<{
  admin: AdminSessionContext["admin"];
  email: string;
  role: AdminSessionContext["admin"]["role"];
  csrfToken: string;
}>;
export async function requirePermission(
  req: Request,
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
  req: Request,
  permission: AdminPermission,
  method: "GET" | "PATCH" | "POST" = "GET"
) {
  const ctx =
    method === "GET"
      ? await requireSession(req)
      : await requireSession(req, { requireCsrf: true });

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

  const parsedBody = (req.body ?? {}) as Record<string, unknown>;
  if (
    !roleHasPermission(ctx.admin.role, permission) &&
    !roleHasPermission(ctx.admin.role, "write")
  ) {
    throw new AdminAuthError("Insufficient permissions");
  }
  return { ...base, parsedBody };
}
