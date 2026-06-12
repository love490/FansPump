import { prisma } from "@iopn/database";
import { hashAdminPassword, normalizeAdminEmail } from "@/lib/admin/password";

export type BootstrapStatus = {
  adminCount: number;
  bootstrapped: boolean;
  configured: boolean;
};

/** Creates the first super admin from env when no admins exist. */
export async function bootstrapAdminFromEnv(): Promise<BootstrapStatus> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const configured = Boolean(email && password);

  let adminCount = 0;
  try {
    adminCount = await prisma.admin.count();
  } catch (e) {
    console.error("[admin] Failed to read admins table:", e);
    throw e;
  }

  if (adminCount > 0) {
    return { adminCount, bootstrapped: false, configured };
  }

  if (!configured) {
    console.warn(
      "[admin] No admins in database. Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD to create the first super admin."
    );
    return { adminCount: 0, bootstrapped: false, configured: false };
  }

  const normalizedEmail = normalizeAdminEmail(email!);
  const passwordHash = await hashAdminPassword(password!);

  await prisma.admin.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.info(`[admin] Bootstrapped super admin: ${normalizedEmail}`);
  return { adminCount: 1, bootstrapped: true, configured: true };
}
