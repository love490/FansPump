import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError, requireAdminAuth } from "@/lib/admin-auth";
import { z } from "zod";

const patchSchema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  isFeatured: z.boolean().optional(),
  trendingScore: z.number().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    await requireAdminAuth(body);

    const data: { isFeatured?: boolean; trendingScore?: number } = {};
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
    if (body.trendingScore !== undefined) data.trendingScore = body.trendingScore;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const token = await prisma.tokenProject.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      token: { ...token, featureFlags: token.featureFlags.toString() },
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
