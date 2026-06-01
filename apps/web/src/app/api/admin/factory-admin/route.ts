import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet, getFactoryAdminAddress } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.toLowerCase();
  if (!wallet) {
    return NextResponse.json({ isFactoryAdmin: false });
  }

  const factoryAdmin = getFactoryAdminAddress();
  const isFactoryAdmin = factoryAdmin ? wallet === factoryAdmin : isAdminWallet(wallet);

  return NextResponse.json({ isFactoryAdmin });
}
