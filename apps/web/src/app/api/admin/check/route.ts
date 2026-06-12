import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    isAdmin: false,
    message:
      "Wallet admin check is deprecated. Platform admins sign in at /admin/login with email and password.",
  });
}
