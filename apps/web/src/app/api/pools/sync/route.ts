import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { syncPoolFromChain } from "@/lib/pools/index";

const bodySchema = z.object({
  poolAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

/** Index or refresh a DEX pool from on-chain data (read-only analytics prep). */
export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const pool = await syncPoolFromChain(body.poolAddress.toLowerCase());

    if (!pool) {
      return NextResponse.json({ error: "Could not index pool" }, { status: 400 });
    }

    return NextResponse.json({ pool });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid pool address" }, { status: 400 });
    }
    console.error("[POST /api/pools/sync]", e);
    return NextResponse.json({ error: "Failed to sync pool" }, { status: 500 });
  }
}
