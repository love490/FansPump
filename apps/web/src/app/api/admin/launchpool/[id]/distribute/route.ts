import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminSessionWithCsrf } from "@/lib/admin/api-auth";
import { roleHasPermission } from "@/lib/admin/roles";
import { distributeLaunchpoolRewards } from "@/lib/launchpool/rewards";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const { admin } = await requireAdminSessionWithCsrf(_request);
    if (!roleHasPermission(admin.role, "launchpool")) {
      throw new AdminAuthError("Insufficient permissions");
    }
    const result = await distributeLaunchpoolRewards(id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Distribution failed";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("already distributed")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Distribution failed" }, { status: 500 });
  }
}
