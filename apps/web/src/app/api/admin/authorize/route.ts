import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError, requireAdminAuth } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await requireAdminAuth(body);
    return NextResponse.json({ authorized: true });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Authorization failed" }, { status: 400 });
  }
}
