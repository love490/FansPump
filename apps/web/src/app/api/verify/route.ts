import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { verifyMessage } from "viem";
import { z } from "zod";

const schema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  signature: z.string(),
  message: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const wallet = body.walletAddress.toLowerCase() as `0x${string}`;

    const prefix = process.env.VERIFICATION_MESSAGE_PREFIX ?? "FansPump Creator Verification";
    if (!body.message.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid verification message" }, { status: 400 });
    }

    const valid = await verifyMessage({
      address: wallet,
      message: body.message,
      signature: body.signature as `0x${string}`,
    });

    if (!valid) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet },
      update: {},
    });

    const verification = await prisma.creatorVerification.upsert({
      where: { walletAddress: wallet },
      create: {
        walletAddress: wallet,
        signature: body.signature,
        message: body.message,
      },
      update: {
        signature: body.signature,
        message: body.message,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({ verified: true, verification });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return NextResponse.json({ verified: false });

  const v = await prisma.creatorVerification.findUnique({ where: { walletAddress: wallet } });
  return NextResponse.json({ verified: !!v });
}
