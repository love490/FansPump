import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Wallet-based admin authentication has been replaced. Use /admin/login with email and password.",
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Wallet-based admin authentication has been replaced. Use POST /api/admin/auth/login.",
    },
    { status: 410 }
  );
}
