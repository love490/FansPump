import { prisma } from "@iopn/database";
import { hashAdminPassword, normalizeAdminEmail } from "@/lib/admin/password";

/** Creates the first super admin from env when no admins exist. */
export async function bootstrapAdminFromEnv(): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) return;

  const count = await prisma.admin.count();
  if (count > 0) return;

  const normalizedEmail = normalizeAdminEmail(email);
  const passwordHash = await hashAdminPassword(password);

  await prisma.admin.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.info(`[admin] Bootstrapped super admin: ${normalizedEmail}`);
}
