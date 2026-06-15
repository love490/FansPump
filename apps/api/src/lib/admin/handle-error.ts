import type { Response } from "express";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";

export function handleAdminError(res: Response, e: unknown, fallback = "Request failed"): void {
  if (e instanceof AdminAuthError) {
    res.status(401).json({ error: e.message });
    return;
  }
  if (e instanceof z.ZodError) {
    res.status(400).json({ error: e.errors[0]?.message ?? e.flatten() });
    return;
  }
  console.error(e);
  res.status(500).json({ error: fallback });
}

export function isMissingAdminTables(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /admins|admin_sessions|admin_activity_logs|does not exist|Unknown arg/i.test(message);
}
