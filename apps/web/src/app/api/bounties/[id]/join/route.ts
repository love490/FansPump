import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { resolveEffectiveStatus } from "@/lib/bounties";

const joinSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = joinSchema.parse(await request.json());
    const wallet = await requireCreatorActionAuth(body);

    await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet },
      update: {},
    });

    const bounty = await prisma.bounty.findUnique({
      where: { id },
      include: { _count: { select: { participations: true } } },
    });

    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    if (bounty.creatorWallet === wallet) {
      return NextResponse.json({ error: "Creators cannot join their own bounty" }, { status: 400 });
    }

    const effectiveStatus = resolveEffectiveStatus(bounty);
    if (effectiveStatus !== "active") {
      return NextResponse.json({ error: "This bounty is no longer active" }, { status: 400 });
    }

    if (bounty._count.participations >= bounty.maxParticipants) {
      return NextResponse.json({ error: "This bounty is full" }, { status: 409 });
    }

    const existing = await prisma.bountyParticipation.findUnique({
      where: { bountyId_walletAddress: { bountyId: id, walletAddress: wallet } },
    });

    if (existing) {
      return NextResponse.json({ error: "You already joined this bounty" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.bountyParticipation.create({
        data: { bountyId: id, walletAddress: wallet },
      }),
      prisma.bounty.update({
        where: { id },
        data: { participantCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[POST /api/bounties/:id/join]", e);
    return NextResponse.json({ error: "Failed to join bounty" }, { status: 500 });
  }
}
