import type { Request } from "express";
import { isAddress } from "viem";
import { getAppSessionFromRequest } from "@/lib/auth/session";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";

/** Off-chain quest actions (quiz, step visit/claim) — session or linked wallet, no signature. */
export async function resolveOffchainParticipantWallet(
  req: Request,
  body?: { walletAddress?: string; message?: string; signature?: string }
): Promise<string> {
  const session = await getAppSessionFromRequest(req.cookies);
  if (session?.account.walletAddress) {
    return session.account.walletAddress.toLowerCase();
  }

  if (body?.walletAddress && body.message && body.signature) {
    return requireCreatorActionAuth({
      walletAddress: body.walletAddress,
      message: body.message,
      signature: body.signature,
    });
  }

  const wallet = body?.walletAddress?.trim().toLowerCase();
  if (wallet && isAddress(wallet)) {
    return wallet;
  }

  if (session) {
    throw new CreatorAuthError("Link a wallet in settings to complete tasks", 401);
  }

  throw new CreatorAuthError("Sign in or connect your wallet to complete tasks", 401);
}

/** Claiming XP / on-chain bonus — always requires a wallet signature. */
export async function requireSignedParticipantWallet(body: {
  walletAddress: string;
  message: string;
  signature: string;
}): Promise<string> {
  return requireCreatorActionAuth(body);
}
