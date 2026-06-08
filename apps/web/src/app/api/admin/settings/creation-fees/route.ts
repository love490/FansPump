import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type CreationFeesConfig } from "@/lib/admin/platform-settings";

const schema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  fees: z.object({
    baseFee: z.number().min(0),
    burnable: z.number().min(0),
    mintable: z.number().min(0),
    pausable: z.number().min(0),
    blacklist: z.number().min(0),
    antiBot: z.number().min(0),
    taxModule: z.number().min(0),
    ownershipRenounce: z.number().min(0),
    liquidityLock: z.number().min(0),
    verification: z.number().min(0),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "creation_fees", "GET");
    const fees = await platformSettings.getCreationFees();
    return NextResponse.json({ fees });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load fees" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { wallet, parsedBody } = await requirePermission(request, "creation_fees", "PATCH");
    const { fees } = schema.parse(parsedBody);
    await platformSettings.setCreationFees(fees as CreationFeesConfig, wallet);
    await logAdminAction(wallet, "FEE_CHANGE", { section: "creation_fees", fees }, request);
    return NextResponse.json({ ok: true, fees });
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
