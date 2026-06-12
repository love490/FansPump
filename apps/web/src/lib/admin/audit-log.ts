import { prisma } from "@iopn/database";
import type { Prisma } from "@iopn/database";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/admin/server-session";

export async function logAdminAction(
  adminEmail: string,
  action: string,
  details?: Record<string, unknown>,
  request?: NextRequest,
  adminId?: string | null
) {
  const ipAddress = getClientIp(request);

  await prisma.adminActivityLog.create({
    data: {
      adminId: adminId ?? undefined,
      adminEmail: adminEmail.toLowerCase(),
      action,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress,
    },
  });
}

/** @deprecated Legacy wallet-based audit entries */
export async function logAdminWalletAction(
  adminWallet: string,
  action: string,
  details?: Record<string, unknown>,
  request?: NextRequest
) {
  const ipAddress = getClientIp(request);

  await prisma.adminActivityLog.create({
    data: {
      adminEmail: adminWallet.toLowerCase(),
      adminWallet: adminWallet.toLowerCase(),
      action,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress,
    },
  });
}

export async function getActivityLogs(limit = 100, offset = 0) {
  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.adminActivityLog.count(),
  ]);
  return { logs, total };
}
