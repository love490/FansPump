import { prisma } from "@iopn/database";
import type { Prisma } from "@iopn/database";
import type { NextRequest } from "next/server";

export async function logAdminAction(
  adminWallet: string,
  action: string,
  details?: Record<string, unknown>,
  request?: NextRequest
) {
  const ipAddress =
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request?.headers.get("x-real-ip") ??
    null;

  await prisma.adminActivityLog.create({
    data: {
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
