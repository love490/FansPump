import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { z } from "zod";

const patchSchema = z.object({
  isFeatured: z.boolean().optional(),
  trendingScore: z.number().optional(),
  isHidden: z.boolean().optional(),
  isScam: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await requirePermission(request, "discovery", "PATCH");
    const body = patchSchema.parse(ctx.parsedBody);

    const data: {
      isFeatured?: boolean;
      trendingScore?: number;
      isHidden?: boolean;
      isScam?: boolean;
    } = {};
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
    if (body.trendingScore !== undefined) data.trendingScore = body.trendingScore;
    if (body.isHidden !== undefined) data.isHidden = body.isHidden;
    if (body.isScam !== undefined) data.isScam = body.isScam;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const token = await prisma.tokenProject.update({
      where: { id },
      data,
    });

    await logAdminAction(
      ctx.email,
      "TOKEN_MODERATION",
      { tokenId: id, ...data },
      request,
      ctx.admin.id
    );

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
