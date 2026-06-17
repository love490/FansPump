import prisma from "../prisma";

/** Initialize analytics + pool stats when a token is registered (idempotent). */
export async function initializeTokenAnalytics(args: {
  tokenId: string;
  tokenAddress: string;
}) {
  const address = args.tokenAddress.toLowerCase();

  await prisma.tokenPoolStats.upsert({
    where: { tokenId: args.tokenId },
    create: {
      tokenId: args.tokenId,
      tokenAddress: address,
      accumulatedPoolValue: "0",
      poolReserveEstimate: "0",
    },
    update: {},
  });

  await prisma.platformTreasuryLedger.upsert({
    where: { id: "global" },
    create: { id: "global", totalWei: "0" },
    update: {},
  });
}
