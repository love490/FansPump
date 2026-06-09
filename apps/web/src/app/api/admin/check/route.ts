import { NextRequest, NextResponse } from "next/server";
import { getAdminMessagePrefix, isAdminWallet } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  const messagePrefix = getAdminMessagePrefix();

  if (!wallet) {
    return NextResponse.json({ isAdmin: false, messagePrefix });
  }

  return NextResponse.json({ isAdmin: isAdminWallet(wallet), messagePrefix });
}
