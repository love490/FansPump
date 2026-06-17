import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

/** Proxy multipart uploads to Express — Vercel rewrites break FormData bodies. */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const upstream = await fetch(`${API_BASE.replace(/\/$/, "")}/api/upload`, {
      method: "POST",
      body: formData,
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    console.error("[api/upload proxy]", error);
    return NextResponse.json(
      { error: "Upload proxy failed — API may be unreachable." },
      { status: 502 }
    );
  }
}
