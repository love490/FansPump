import type { StakingPlatformConfig } from "@iopn/shared";
import { prisma } from "@iopn/database";

export async function computeWalletStakingTier(
  wallet: string,
  config: StakingPlatformConfig,
  extraOpnWei = 0n
): Promise<string | null> {
  const positions = await prisma.stakingPosition.findMany({
    where: { wallet: { equals: wallet, mode: "insensitive" }, isActive: true, assetType: "OPN" },
    select: { amount: true },
  });

  let totalOpnWei = extraOpnWei;
  for (const row of positions) {
    try {
      totalOpnWei += BigInt(row.amount || "0");
    } catch {
      /* skip */
    }
  }

  const totalOpn = Number(totalOpnWei) / 1e18;
  const tiers = [...config.tiers].sort(
    (a, b) => Number(b.minStakeOpn) - Number(a.minStakeOpn)
  );

  for (const tier of tiers) {
    if (totalOpn >= Number(tier.minStakeOpn)) {
      return tier.tier;
    }
  }

  return null;
}
