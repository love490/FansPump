import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";

const patchSchema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  tokenId: z.string(),
  action: z.enum(["approve", "reject", "revoke", "submit"]),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "verification", "GET");
    const status = request.nextUrl.searchParams.get("status");

    const tokens = await prisma.tokenProject.findMany({
      where: status && status !== "all"
        ? { verificationStatus: status.toUpperCase() as "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" }
        : { verificationStatus: { not: "NONE" } },
      orderBy: { verificationSubmittedAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        symbol: true,
        contractAddress: true,
        creatorAddress: true,
        verificationStatus: true,
        verificationSubmittedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      submissions: tokens.map((t) => ({
        tokenId: t.id,
        token: `${t.name} (${t.symbol})`,
        wallet: t.creatorAddress,
        contractAddress: t.contractAddress,
        status: t.verificationStatus,
        submittedAt: t.verificationSubmittedAt?.toISOString() ?? t.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load verifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { wallet, parsedBody } = await requirePermission(request, "verification", "PATCH");
    const { tokenId, action } = patchSchema.parse(parsedBody);

    const statusMap = {
      approve: "APPROVED" as const,
      reject: "REJECTED" as const,
      revoke: "REVOKED" as const,
      submit: "PENDING" as const,
    };

    const token = await prisma.tokenProject.update({
      where: { id: tokenId },
      data: {
        verificationStatus: statusMap[action],
        verificationSubmittedAt: action === "submit" ? new Date() : undefined,
      },
    });

    await logAdminAction(
      wallet,
      "VERIFICATION_DECISION",
      { tokenId, action, status: statusMap[action] },
      request
    );

    return NextResponse.json({
      ok: true,
      token: { id: token.id, verificationStatus: token.verificationStatus },
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
