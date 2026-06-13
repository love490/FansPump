import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { isAddress } from "viem";
import { z } from "zod";
import { isValidUsername, normalizeUsername } from "@/lib/username";

const updateSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  username: z.string().max(24).optional(),
  profileImageUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.trim().toLowerCase() ?? "";
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: wallet },
    select: { walletAddress: true, username: true, profileImageUrl: true },
  });

  return NextResponse.json({
    profile: {
      walletAddress: wallet,
      username: user?.username ?? null,
      profileImageUrl: user?.profileImageUrl ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = updateSchema.parse(await request.json());
    const wallet = body.walletAddress.toLowerCase();

    const data: { username?: string | null; profileImageUrl?: string | null } = {};

    if (body.username !== undefined) {
      const raw = normalizeUsername(body.username);
      if (!raw) {
        data.username = null;
      } else {
        if (!isValidUsername(raw)) {
          return NextResponse.json(
            { error: "Username must be 3–24 characters (letters, numbers, underscore only)" },
            { status: 400 }
          );
        }

        const taken = await prisma.user.findFirst({
          where: {
            username: { equals: raw, mode: "insensitive" },
            NOT: { walletAddress: wallet },
          },
          select: { walletAddress: true },
        });

        if (taken) {
          return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
        }

        data.username = raw;
      }
    }

    if (body.profileImageUrl !== undefined) {
      data.profileImageUrl = body.profileImageUrl || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No profile fields to update" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet, ...data },
      update: data,
      select: { walletAddress: true, username: true, profileImageUrl: true },
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
