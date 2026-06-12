import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminSession } from "@/lib/admin/api-auth";
import { getAdminOverview } from "@/lib/admin/overview";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession(request);
    const overview = await getAdminOverview();
    return NextResponse.json({ overview });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[GET /api/admin/overview]", e);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
