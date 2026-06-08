import { NextResponse } from "next/server";
import { getGlobalAnalytics } from "@/lib/analytics/queries";

export async function GET() {
  try {
    const analytics = await getGlobalAnalytics();
    return NextResponse.json(
      { analytics },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    console.error("[GET /api/analytics/global]", e);
    return NextResponse.json({ error: "Failed to load global analytics" }, { status: 500 });
  }
}
