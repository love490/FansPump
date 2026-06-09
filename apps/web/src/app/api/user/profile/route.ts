import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { isAddress } from "viem";
import { z } from "zod";
import { isValidUsername, normalizeUsername } from "@/lib/username";

const updateSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  username: z.string().min(1).max(24),
});

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.trim().toLowerCase() ?? "";
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: wallet },
    select: { walletAddress: true, username: true },
  });

  return NextResponse.json({
    profile: {
      walletAddress: wallet,
      username: user?.username ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = updateSchema.parse(await request.json());
    const wallet = body.walletAddress.toLowerCase();
    const username = normalizeUsername(body.username);

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Username must be 3–24 characters (letters, numbers, underscore only)" },
        { status: 400 }
      );
    }

    const taken = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        NOT: { walletAddress: wallet },
      },
      select: { walletAddress: true },
    });

    if (taken) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet, username },
      update: { username },
      select: { walletAddress: true, username: true },
    });

    return NextResponse.json({ profile: user });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[PATCH /api/user/profile]", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
