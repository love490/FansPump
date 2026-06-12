import { prisma } from "@iopn/database";
import type { CreatorStatus } from "@iopn/database";

export async function ensureCreatorProfile(walletAddress: string) {
  const wallet = walletAddress.toLowerCase();
  return prisma.creatorProfile.upsert({
    where: { walletAddress: wallet },
    create: { walletAddress: wallet },
    update: {},
  });
}

export function resolveCreatorStatus(input: {
  profileStatus: CreatorStatus;
  walletVerified: boolean;
  reputationScore: number;
}): CreatorStatus {
  if (input.profileStatus === "TRUSTED") return "TRUSTED";
  if (input.profileStatus === "VERIFIED" || input.walletVerified) return "VERIFIED";
  if (input.reputationScore >= 750) return "TRUSTED";
  if (input.reputationScore >= 250 || input.walletVerified) return "VERIFIED";
  return "ANONYMOUS";
}

export async function awardReputation(
  walletAddress: string,
  delta: { xp?: number; reputation?: number; badge?: string }
) {
  const wallet = walletAddress.toLowerCase();
  await ensureCreatorProfile(wallet);

  const profile = await prisma.creatorProfile.findUnique({ where: { walletAddress: wallet } });
  const badges = new Set(profile?.badges ?? []);
  if (delta.badge) badges.add(delta.badge);

  return prisma.creatorProfile.update({
    where: { walletAddress: wallet },
    data: {
      fansPumpXp: delta.xp ? { increment: delta.xp } : undefined,
      reputationScore: delta.reputation ? { increment: delta.reputation } : undefined,
      badges: [...badges],
    },
  });
}

export async function getCreatorReputation(walletAddress: string) {
  const wallet = walletAddress.toLowerCase();
  const profile = await prisma.creatorProfile.findUnique({ where: { walletAddress: wallet } });
  return profile?.reputationScore ?? 0;
}

/** Penalize creators linked to flagged scam tokens. */
export async function applyScamPenalty(creatorAddress: string, amount = 100) {
  const wallet = creatorAddress.toLowerCase();
  await ensureCreatorProfile(wallet);
  return prisma.creatorProfile.update({
    where: { walletAddress: wallet },
    data: { reputationScore: { decrement: amount } },
  });
}
