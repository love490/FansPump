import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) {
    return NextResponse.json({ isAdmin: false });
  }

  return NextResponse.json({ isAdmin: isAdminWallet(wallet) });
}
