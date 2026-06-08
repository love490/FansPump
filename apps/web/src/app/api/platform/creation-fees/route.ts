import { NextResponse } from "next/server";
import { platformSettings } from "@/lib/admin/platform-settings";

/** Public read-only endpoint for future token creation fee display (additive). */
export async function GET() {
  try {
    const fees = await platformSettings.getCreationFees();
    return NextResponse.json(
      { fees },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to load fees" }, { status: 500 });
  }
}
