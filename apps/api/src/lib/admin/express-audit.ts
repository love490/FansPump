import type { Request } from "express";
import type { Prisma } from "@iopn/database";
import { getClientIp } from "./express-session";
import prisma from "../prisma";

export async function logAdminAction(
  adminEmail: string,
  action: string,
  details?: Record<string, unknown>,
  req?: Request,
  adminId?: string | null
) {
  const ipAddress = getClientIp(req);

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
