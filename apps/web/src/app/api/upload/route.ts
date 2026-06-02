import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use JPG, PNG, WebP, or GIF" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be 5 MB or smaller" }, { status: 400 });
    }

    const ext = EXT_BY_TYPE[file.type] ?? "png";
    const filename = `${randomUUID()}.${ext}`;

    // Prefer a durable object store on Vercel (Blob). Serverless filesystem writes are not reliable.
    // Enable by setting BLOB_READ_WRITE_TOKEN in the deployment environment.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const key = `projects/${filename}`;
      const blob = await put(key, file, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return NextResponse.json({ url: blob.url, path: key });
    }

    // On Vercel/serverless, filesystem is read-only (EROFS). Don't attempt local writes.
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "Image uploads are not configured. Set BLOB_READ_WRITE_TOKEN in Vercel (Storage → Blob) and redeploy.",
        },
        { status: 500 }
      );
    }

    // Local/dev fallback: write into /public/uploads/projects
    const uploadDir = path.join(process.cwd(), "public", "uploads", "projects");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    const publicPath = `/uploads/projects/${filename}`;
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const origin = host ? `${proto}://${host}` : request.nextUrl.origin;

    return NextResponse.json({ url: `${origin}${publicPath}`, path: publicPath });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
