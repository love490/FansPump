import type { StakingPlatformConfig } from "@iopn/shared";
import { resolveStakingTier } from "@/lib/staking/config";

export async function computeWalletStakingTier(
  wallet: string,
  config: StakingPlatformConfig,
  extraOpnWei = 0n
): Promise<string | null> {
  const { prisma } = await import("@iopn/database");

  const activeOpn = await prisma.stakingPosition.findMany({
    where: { wallet, isActive: true, assetType: "OPN" },
    select: { amount: true },
  });

  const total = activeOpn.reduce((sum, row) => sum + BigInt(row.amount), 0n) + extraOpnWei;
  return resolveStakingTier(total, config.tiers);
}
