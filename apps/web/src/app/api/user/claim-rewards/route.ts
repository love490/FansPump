import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformSetting, DEFAULT_SECURITY } from "@/lib/admin/platform-settings";
import { requireCreatorActionAuth, CreatorAuthError } from "@/lib/creator-auth";
import { getCreatorEarningsTotal } from "@/lib/analytics/queries";
import { weiToOpnFloat } from "@/lib/analytics/fee-split";
import { prisma } from "@iopn/database";

const CLAIM_PREFIX = "FansPump Claim Rewards";

const claimSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = claimSchema.parse(body);
    const wallet = await requireCreatorActionAuth({
      ...parsed,
      expectedPrefix: CLAIM_PREFIX,
    });

    const security = await getPlatformSetting("security", DEFAULT_SECURITY);
    if (security.claimsPaused) {
      return NextResponse.json({ error: "Reward claims are temporarily paused" }, { status: 503 });
    }

    const [creatorEarningsWei, completedParticipations] = await Promise.all([
      getCreatorEarningsTotal(wallet),
      prisma.bountyParticipation.findMany({
        where: {
          walletAddress: wallet,
          bounty: { status: "COMPLETED" },
        },
        include: {
          bounty: { select: { rewardType: true, rewardAmount: true } },
        },
      }),
    ]);

    const bountyOpn = completedParticipations
      .filter((p) => p.bounty.rewardType === "OPN")
      .reduce((sum, p) => sum + Number(p.bounty.rewardAmount || 0), 0);

    const creatorOpn = weiToOpnFloat(BigInt(creatorEarningsWei || "0"));
    const totalOpn = bountyOpn + creatorOpn;

    if (totalOpn <= 0) {
      return NextResponse.json({ error: "No claimable rewards" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      claimedOpn: totalOpn,
      message: `Claim submitted for ${totalOpn.toLocaleString(undefined, { maximumFractionDigits: 4 })} OPN. Payout will be processed to your wallet.`,
    });
  } catch (e) {
    if (e instanceof CreatorAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error("[POST /api/user/claim-rewards]", e);
    return NextResponse.json({ error: "Failed to claim rewards" }, { status: 500 });
  }
}
