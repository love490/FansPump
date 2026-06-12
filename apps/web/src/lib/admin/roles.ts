import type { AdminRole } from "@iopn/database";
import { prisma } from "@iopn/database";
import type { AdminPermission } from "@/lib/admin/types";

export type { AdminPermission } from "@/lib/admin/types";
export type { AdminRole } from "@iopn/database";

const ALL_PERMISSIONS: AdminPermission[] = [
  "overview",
  "creation_fees",
  "trading_fees",
  "treasury",
  "verification",
  "discovery",
  "analytics",
  "creator_earnings",
  "pool_share",
  "bridge",
  "security",
  "system",
  "activity_logs",
  "roles",
  "factory",
  "categories",
  "announcements",
  "staking",
  "trust_panel",
  "v2_platform",
  "write",
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: [
    "overview",
    "creation_fees",
    "trading_fees",
    "treasury",
    "verification",
    "discovery",
    "analytics",
    "creator_earnings",
    "pool_share",
    "bridge",
    "security",
    "system",
    "activity_logs",
    "factory",
    "categories",
    "announcements",
    "staking",
    "trust_panel",
    "v2_platform",
    "write",
  ],
  MODERATOR: [
    "overview",
    "verification",
    "discovery",
    "analytics",
    "creator_earnings",
    "categories",
    "announcements",
    "activity_logs",
    "v2_platform",
    "write",
  ],
  SUPPORT: ["overview", "analytics", "creator_earnings", "activity_logs"],
  VIEWER: ["overview", "analytics"],
};

export function roleHasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getRolePermissions(role: AdminRole): AdminPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export async function listAdmins() {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      role: true,
      twoFactorEnabled: true,
      lastLogin: true,
      createdAt: true,
    },
  });

  return admins.map((admin) => ({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    twoFactorEnabled: admin.twoFactorEnabled,
    lastLogin: admin.lastLogin?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
  }));
}

export async function setAdminRoleById(adminId: string, role: AdminRole): Promise<void> {
  await prisma.admin.update({
    where: { id: adminId },
    data: { role },
  });
}

export async function createAdminAccount(
  email: string,
  passwordHash: string,
  role: AdminRole
) {
  return prisma.admin.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role,
    },
    select: { id: true, email: true, role: true },
  });
}

/** Legacy wallet admin profiles — kept for migration reference only. */
export async function listAdminProfiles() {
  return listAdmins();
}
