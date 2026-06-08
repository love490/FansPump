import type { NextRequest } from "next/server";
import { AdminAuthError, verifyAdminAuth, isAdminMessageFresh } from "@/lib/admin-auth";
import type { AdminPermission } from "@/lib/admin/types";
import { getAdminRole, roleHasPermission } from "@/lib/admin/roles";

function authFromQuery(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  return {
    walletAddress: searchParams.get("walletAddress") ?? "",
    signature: searchParams.get("signature") ?? "",
    message: searchParams.get("message") ?? "",
  };
}

function authFromBody(body: Record<string, unknown>) {
  return {
    walletAddress: String(body.walletAddress ?? ""),
    signature: String(body.signature ?? ""),
    message: String(body.message ?? ""),
  };
}

export async function requireAdminFromQuery(request: NextRequest) {
  const payload = authFromQuery(request);
  const wallet = await verifyAdminAuth(payload);
  if (!wallet || !isAdminMessageFresh(payload.message)) {
    throw new AdminAuthError("Unauthorized admin");
  }
  const role = await getAdminRole(wallet);
  if (!role) throw new AdminAuthError("Unauthorized admin");
  return { wallet, role };
}

export async function requireAdminFromBody(body: unknown) {
  const parsed = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const payload = authFromBody(parsed);
  const wallet = await verifyAdminAuth(payload);
  if (!wallet || !isAdminMessageFresh(payload.message)) {
    throw new AdminAuthError("Unauthorized admin");
  }
  const role = await getAdminRole(wallet);
  if (!role) throw new AdminAuthError("Unauthorized admin");
  return { wallet, role, body: parsed };
}

export async function requireAdminGet(request: NextRequest, permission: AdminPermission) {
  const ctx = await requireAdminFromQuery(request);
  if (!roleHasPermission(ctx.role, permission)) {
    throw new AdminAuthError("Insufficient permissions");
  }
  return ctx;
}

export async function requireAdminPatch(request: NextRequest, permission: AdminPermission) {
  const body = await request.json();
  const ctx = await requireAdminFromBody(body);
  if (!roleHasPermission(ctx.role, permission) && !roleHasPermission(ctx.role, "write")) {
    throw new AdminAuthError("Insufficient permissions");
  }
  return { wallet: ctx.wallet, role: ctx.role, parsedBody: ctx.body };
}

type AdminGetContext = { wallet: `0x${string}`; role: import("@iopn/database").AdminRole };
type AdminPatchContext = AdminGetContext & { parsedBody: Record<string, unknown> };

export async function requirePermission(
  request: NextRequest,
  permission: AdminPermission,
  method: "GET"
): Promise<AdminGetContext>;
export async function requirePermission(
  request: NextRequest,
  permission: AdminPermission,
  method: "PATCH" | "POST"
): Promise<AdminPatchContext>;
export async function requirePermission(
  request: NextRequest,
  permission: AdminPermission,
  method: "GET" | "PATCH" | "POST" = "GET"
): Promise<AdminGetContext | AdminPatchContext> {
  if (method === "GET") return requireAdminGet(request, permission);
  return requireAdminPatch(request, permission);
}
