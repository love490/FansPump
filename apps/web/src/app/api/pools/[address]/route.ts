import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { serializePool, syncPoolFromChain } from "@/lib/pools/index";

type RouteParams = { params: Promise<{ address: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { address } = await params;
  const normalized = address.toLowerCase();

  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    return NextResponse.json({ error: "Invalid pool address" }, { status: 400 });
  }

  try {
    const sync = request.nextUrl.searchParams.get("sync") === "1";

    if (sync) {
      const synced = await syncPoolFromChain(normalized);
      if (synced) {
        return NextResponse.json({ pool: synced, synced: true });
      }
    }

    const row = await prisma.liquidityPool.findUnique({ where: { poolAddress: normalized } });
    if (!row) {
      return NextResponse.json(
        { error: "Pool not indexed yet", hint: "Use ?sync=1 to index from chain" },
        { status: 404 }
      );
    }

    return NextResponse.json({ pool: serializePool(row), synced: false });
  } catch (e) {
    console.error("[GET /api/pools/[address]]", e);
    return NextResponse.json({ error: "Failed to load pool" }, { status: 500 });
  }
}
