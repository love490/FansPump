import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";

/** View-only list of wallet-verified creators (no bypass / revoke). */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "verification", "GET");
    const rows = await prisma.creatorVerification.findMany({
      orderBy: { verifiedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      creators: rows.map((r) => ({
        walletAddress: r.walletAddress,
        verifiedAt: r.verifiedAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load verifications" }, { status: 500 });
  }
}
