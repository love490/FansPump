import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const tokenAddress = address.toLowerCase();

  const token = await prisma.tokenProject.findUnique({
    where: { contractAddress: tokenAddress },
    select: { id: true },
  });
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  const [locks, burns] = await Promise.all([
    prisma.liquidityLock.findMany({
      where: { tokenId: token.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lpBurn.findMany({
      where: { tokenId: token.id },
      orderBy: { burnedAt: "desc" },
    }),
  ]);

  const totalLocked = locks.reduce((acc, l) => acc + BigInt(l.amount), 0n);
  const totalBurned = burns.reduce((acc, b) => acc + BigInt(b.amount), 0n);
  const latestUnlockAt = locks.reduce<Date | null>((acc, l) => (acc && acc > l.unlockAt ? acc : l.unlockAt), null);

  return NextResponse.json({
    tokenAddress,
    locks,
    burns,
    totals: {
      lockedAmount: totalLocked.toString(),
      burnedAmount: totalBurned.toString(),
      latestUnlockAt,
    },
  });
}

