import { prisma } from "@iopn/database";

export async function getCreatorEarningsTotal(wallet: string): Promise<string> {
  const rows = await prisma.creatorEarning.findMany({
    where: { creatorAddress: { equals: wallet, mode: "insensitive" } },
    select: { amount: true },
  });

  let total = 0n;
  for (const row of rows) {
    try {
      total += BigInt(row.amount || "0");
    } catch {
      /* skip invalid */
    }
  }

  return total.toString();
}
