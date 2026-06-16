import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { IMAGE_UPLOAD_MAX_BYTES } from "../lib/token-images/constants";
import { processBannerUpload, processLogoUpload } from "../lib/token-images/process";
import { asyncHandler } from "../lib/http-helpers";
import { uploadRateLimit } from "../middleware/rateLimit";

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_UPLOAD_MAX_BYTES },
});

const router = Router();

router.use(uploadRateLimit);

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    try {
      const file = req.file;
      const kind = (typeof req.body.kind === "string" ? req.body.kind : "").toLowerCase();

      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      if (!kind || (kind !== "logo" && kind !== "banner" && kind !== "avatar")) {
        res.status(400).json({ error: "Upload kind must be logo, banner, or avatar" });
        return;
      }
      if (!ALLOWED_TYPES.has(file.mimetype)) {
        res.status(400).json({ error: "Use JPG, PNG, WebP, or GIF" });
        return;
      }
      if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
        res.status(400).json({ error: "File must be 12 MB or smaller" });
        return;
      }

      const r2 = getR2Client();
      const bucket = process.env.R2_BUCKET_NAME;
      const publicUrl = process.env.R2_PUBLIC_URL;

      if (!r2 || !bucket || !publicUrl) {
        console.warn("[upload] R2 not configured, skipping image upload");
        res.status(503).json({ error: "Image storage is not configured yet.", url: null, path: null });
        return;
      }

      const raw = file.buffer;
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

      res.json({
        url,
        thumbUrl,
        width: processed.width,
        height: processed.height,
        format: processed.ext,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      const status = message.includes("must be") || message.includes("too ") ? 400 : 500;
      res.status(status).json({ error: message });
    }
  })
);

export default router;

