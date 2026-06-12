import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth";
import { requireAdminSession } from "@/lib/admin/api-auth";
import { generateTotpSecret, buildTotpQrDataUrl } from "@/lib/admin/totp";
import { prisma } from "@iopn/database";

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdminSession(request);

    if (admin.twoFactorEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 400 });
    }

    const secret = generateTotpSecret();
    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });

    const qrDataUrl = await buildTotpQrDataUrl(admin.email, secret);

    return NextResponse.json({
      secret,
      qrDataUrl,
      message: "Scan the QR code, then confirm with a code to enable 2FA.",
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[admin/auth/2fa/setup]", e);
    return NextResponse.json({ error: "Failed to start 2FA setup" }, { status: 500 });
  }
}
