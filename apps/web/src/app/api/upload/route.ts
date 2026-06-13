import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { IMAGE_UPLOAD_MAX_BYTES } from "@/lib/token-images/constants";
import { processBannerUpload, processLogoUpload } from "@/lib/token-images/process";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadBuffer(
  r2: S3Client,
  bucket: string,
  publicUrl: string,
  buffer: Buffer,
  contentType: string,
  ext: string,
  prefix = "projects",
  suffix = ""
) {
  const key = `${prefix}/${randomUUID()}${suffix}.${ext}`;
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${publicUrl}/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = (formData.get("kind") as string | null)?.toLowerCase();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!kind || (kind !== "logo" && kind !== "banner" && kind !== "avatar")) {
      return NextResponse.json({ error: "Upload kind must be logo, banner, or avatar" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use JPG, PNG, WebP, or GIF" }, { status: 400 });
    }
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      return NextResponse.json({ error: "File must be 12 MB or smaller" }, { status: 400 });
    }

    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!r2 || !bucket || !publicUrl) {
      console.warn("[upload] R2 not configured, skipping image upload");
      return NextResponse.json({ url: null, path: null });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const processed =
      kind === "banner" ? await processBannerUpload(raw) : await processLogoUpload(raw);

    const prefix = kind === "avatar" ? "profiles" : "projects";
    const url = await uploadBuffer(
      r2,
      bucket,
      publicUrl,
      processed.main,
      processed.contentType,
      processed.ext,
      prefix
    );

    let thumbUrl: string | null = null;
    if (processed.thumb) {
      thumbUrl = await uploadBuffer(
        r2,
        bucket,
        publicUrl,
        processed.thumb,
        processed.contentType,
        processed.ext,
        prefix,
        "-thumb"
      );
    }

    return NextResponse.json({
      url,
      thumbUrl,
      width: processed.width,
      height: processed.height,
      format: processed.ext,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status = message.includes("must be") || message.includes("too ") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
