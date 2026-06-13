import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import type { Prisma } from "@iopn/database";
import { z } from "zod";
import { isAddress } from "viem";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { ensureCreatorProfile } from "@/lib/v2/reputation";
import {
  bountyListInclude,
  bountyTabOrderBy,
  bountyTabWhere,
  mapBountyRow,
  type BountyTab,
} from "@/lib/bounties";

const TAB_IDS = ["trending", "active", "completed", "ended"] as const;

const createSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  taskType: z.enum(["SOCIAL", "CONTENT", "REFERRAL", "COMMUNITY", "CUSTOM"]),
  requirements: z.string().max(2000).optional().nullable(),
  rewardType: z.enum(["OPN", "TOKEN", "CUSTOM", "XP"]),
  rewardAmount: z.string().min(1).max(64),
  rewardDescription: z.string().max(200).optional().nullable(),
  maxParticipants: z.number().int().min(1).max(10000),
  endsAt: z.string().datetime().optional().nullable(),
  tokenAddress: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = (searchParams.get("tab") ?? "trending") as BountyTab;
  const creatorWallet = searchParams.get("creator")?.toLowerCase();
  const scope = searchParams.get("scope");
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 50);

  if (scope !== "mine" && !TAB_IDS.includes(tab as (typeof TAB_IDS)[number])) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  try {
    const where =
      creatorWallet && scope === "mine"
        ? { creatorWallet }
        : {
            ...bountyTabWhere(tab),
            ...(creatorWallet ? { creatorWallet } : {}),
          };

    const orderBy: Prisma.BountyOrderByWithRelationInput[] =
      creatorWallet && scope === "mine"
        ? [{ createdAt: "desc" }]
        : bountyTabOrderBy(tab);

    const bounties = await prisma.bounty.findMany({
      where,
      orderBy,
      take: limit,
      include: bountyListInclude,
    });

    return NextResponse.json({
      tab,
      bounties: bounties.map(mapBountyRow),
    });
  } catch (e) {
    console.error("[GET /api/bounties]", e);
    return NextResponse.json({ error: "Failed to load bounties" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const wallet = await requireCreatorActionAuth(parsed);

    await ensureCreatorProfile(wallet);

    await prisma.user.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet },
      update: {},
    });

    let tokenId: string | undefined;
    let tokenAddress: string | undefined;
    if (parsed.tokenAddress) {
      if (!isAddress(parsed.tokenAddress)) {
        return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
      }
      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: parsed.tokenAddress.toLowerCase() },
      });
      if (!token || token.creatorAddress !== wallet) {
        return NextResponse.json({ error: "You can only link your own tokens" }, { status: 403 });
      }
      tokenId = token.id;
      tokenAddress = token.contractAddress;
    }

    if (parsed.rewardType === "TOKEN" && !tokenAddress) {
      return NextResponse.json({ error: "Select a token for token rewards" }, { status: 400 });
    }

    const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
    }

    const bounty = await prisma.bounty.create({
      data: {
        creatorWallet: wallet,
        tokenId,
        tokenAddress,
        title: parsed.title.trim(),
        description: parsed.description.trim(),
        taskType: parsed.taskType,
        requirements: parsed.requirements?.trim() || null,
        rewardType: parsed.rewardType,
        rewardAmount: parsed.rewardAmount.trim(),
        rewardDescription: parsed.rewardDescription?.trim() || null,
        maxParticipants: parsed.maxParticipants,
        endsAt,
      },
      include: bountyListInclude,
    });

    return NextResponse.json({ bounty: mapBountyRow(bounty) });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid bounty details" }, { status: 400 });
    }
    console.error("[POST /api/bounties]", e);
    return NextResponse.json({ error: "Failed to create bounty" }, { status: 500 });
  }
}
