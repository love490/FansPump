import { verifyMessage } from "viem";
import { z } from "zod";
import { getAdminMessagePrefix, isAdminWallet } from "./admin";

const adminAuthSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  signature: z.string(),
  message: z.string(),
});

export type AdminAuthPayload = z.infer<typeof adminAuthSchema>;

export function parseAdminAuth(body: unknown): AdminAuthPayload {
  return adminAuthSchema.parse(body);
}

/** Validates wallet is allowlisted and signature matches the admin authorization message. */
export async function verifyAdminAuth(payload: AdminAuthPayload): Promise<`0x${string}` | null> {
  const wallet = payload.walletAddress.toLowerCase() as `0x${string}`;

  if (!isAdminWallet(wallet)) {
    return null;
  }

  const prefix = getAdminMessagePrefix();
  if (!payload.message.startsWith(prefix)) {
    return null;
  }

  const valid = await verifyMessage({
    address: wallet,
    message: payload.message,
    signature: payload.signature as `0x${string}`,
  });

  return valid ? wallet : null;
}

export function buildAdminAuthMessage(wallet: string, prefix?: string): string {
  const messagePrefix = prefix ?? getAdminMessagePrefix();
  return `${messagePrefix}\nWallet: ${wallet}\nTimestamp: ${Date.now()}`;
}

/** Reject messages older than 24 hours to limit replay window. */
export function isAdminMessageFresh(message: string, maxAgeMs = 86_400_000): boolean {
  const match = message.match(/Timestamp:\s*(\d+)/);
  if (!match) return false;
  const ts = Number(match[1]);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= maxAgeMs;
}

export async function requireAdminAuth(body: unknown): Promise<`0x${string}`> {
  const payload = parseAdminAuth(body);
  const wallet = await verifyAdminAuth(payload);
  if (!wallet) {
    throw new AdminAuthError("Unauthorized admin");
  }
  if (!isAdminMessageFresh(payload.message)) {
    throw new AdminAuthError("Admin authorization expired — sign in again");
  }
  return wallet;
}

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}
