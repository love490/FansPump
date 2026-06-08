import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError } from "@/lib/admin-auth";
import { requirePermission } from "@/lib/admin/api-auth";
import { logAdminAction } from "@/lib/admin/audit-log";
import { platformSettings, type TradingFeesConfig } from "@/lib/admin/platform-settings";

const schema = z.object({
  walletAddress: z.string(),
  signature: z.string(),
  message: z.string(),
  fees: z.object({
    totalTradingFeeBps: z.number().min(0).max(10_000),
    creatorShareBps: z.number().min(0).max(10_000),
    treasuryShareBps: z.number().min(0).max(10_000),
    poolShareBps: z.number().min(0).max(10_000),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "trading_fees", "GET");
    const fees = await platformSettings.getTradingFees();
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
    const { wallet, parsedBody } = await requirePermission(request, "trading_fees", "PATCH");
    const { fees } = schema.parse(parsedBody);
    const sum = fees.creatorShareBps + fees.treasuryShareBps + fees.poolShareBps;
    if (sum !== 10_000) {
      return NextResponse.json(
        { error: "Creator + Treasury + Pool must equal 100% (10000 bps)" },
        { status: 400 }
      );
    }
    await platformSettings.setTradingFees(fees as TradingFeesConfig, wallet);
    await logAdminAction(wallet, "FEE_CHANGE", { section: "trading_fees", fees }, request);
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
