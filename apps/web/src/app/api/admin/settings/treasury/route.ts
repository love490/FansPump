import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type TreasuryConfig } from "@/lib/admin/platform-settings";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/i).or(z.literal(""));

const schema = z.object({
  treasury: z.object({
    treasuryWallet: addressSchema,
    revenueWallet: addressSchema,
    emergencyWallet: addressSchema,
    walletType: z.enum(["EOA", "SAFE_MULTISIG"]),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "treasury", "GET");
    const treasury = await platformSettings.getTreasury();
    return NextResponse.json({ treasury });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load treasury" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { email, admin, parsedBody } = await requirePermission(request, "treasury", "PATCH");
    const { treasury } = schema.parse(parsedBody);
    await platformSettings.setTreasury(treasury as TreasuryConfig, email);
    await logAdminAction(email, "WALLET_CHANGE", { section: "treasury", treasury }, request, admin.id);
    return NextResponse.json({ ok: true, treasury });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
