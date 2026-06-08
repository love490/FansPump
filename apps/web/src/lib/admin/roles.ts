import type { AdminRole } from "@iopn/database";
import { prisma } from "@iopn/database";
import { isAdminWallet } from "@/lib/admin";
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
  "write",
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  MODERATOR: [
    "overview",
    "verification",
    "discovery",
    "analytics",
    "creator_earnings",
    "activity_logs",
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

function roleFromEnv(wallet: string): AdminRole | null {
  const raw = process.env.ADMIN_ROLE_MAP ?? "";
  for (const entry of raw.split(",")) {
    const [addr, role] = entry.split(":").map((s) => s.trim());
    if (addr?.toLowerCase() === wallet.toLowerCase() && role) {
      const upper = role.toUpperCase() as AdminRole;
      if (["SUPER_ADMIN", "MODERATOR", "SUPPORT", "VIEWER"].includes(upper)) return upper;
    }
  }
  return null;
}

export async function getAdminRole(wallet: string): Promise<AdminRole | null> {
  const normalized = wallet.toLowerCase();
  if (!isAdminWallet(normalized)) return null;

  const profile = await prisma.adminProfile.findUnique({
    where: { walletAddress: normalized },
  });
  if (profile) return profile.role;

  return roleFromEnv(normalized) ?? "SUPER_ADMIN";
}

export async function ensureAdminProfile(wallet: string): Promise<AdminRole> {
  const normalized = wallet.toLowerCase();
  const role = (await getAdminRole(normalized)) ?? "SUPER_ADMIN";

  await prisma.adminProfile.upsert({
    where: { walletAddress: normalized },
    create: { walletAddress: normalized, role },
    update: {},
  });

  return role;
}

export async function setAdminRole(
  wallet: string,
  role: AdminRole,
  updatedBy: string
): Promise<void> {
  const normalized = wallet.toLowerCase();
  if (!isAdminWallet(normalized)) {
    throw new Error("Wallet is not in admin allowlist");
  }
  await prisma.adminProfile.upsert({
    where: { walletAddress: normalized },
    create: { walletAddress: normalized, role },
    update: { role },
  });
}

export async function listAdminProfiles() {
  const wallets = process.env.ADMIN_WALLET_ADDRESSES?.split(",").map((w) => w.trim().toLowerCase()) ?? [];
  const profiles = await prisma.adminProfile.findMany();
  const profileMap = new Map(profiles.map((p) => [p.walletAddress, p]));

  return wallets
    .filter((w) => /^0x[a-f0-9]{40}$/.test(w))
    .map((wallet) => {
      const p = profileMap.get(wallet);
      return {
        walletAddress: wallet,
        role: p?.role ?? roleFromEnv(wallet) ?? "SUPER_ADMIN",
        createdAt: p?.createdAt?.toISOString() ?? null,
      };
    });
}
