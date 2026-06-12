import { NextResponse } from "next/server";
import { getPublicV2FeatureFlags } from "@/lib/v2/feature-flags";

export async function GET() {
  return NextResponse.json({ flags: getPublicV2FeatureFlags() });
}
