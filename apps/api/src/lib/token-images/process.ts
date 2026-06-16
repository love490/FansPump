import sharp from "sharp";
import { BANNER_UPLOAD, LOGO_UPLOAD } from "@/lib/token-images/constants";
import { validateBannerDimensions, validateLogoDimensions } from "@/lib/token-images/validate";

export type ProcessedImage = {
  main: Buffer;
  thumb?: Buffer;
  contentType: string;
  ext: string;
  width: number;
  height: number;
};

export async function processLogoUpload(buffer: Buffer): Promise<ProcessedImage> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // Dimensions are advisory only — always resize/crop on upload.
  validateLogoDimensions({ width, height });

  const main = await sharp(buffer)
    .rotate()
    .resize(LOGO_UPLOAD.outputPx, LOGO_UPLOAD.outputPx, { fit: "cover", position: "centre" })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const thumb = await sharp(buffer)
    .rotate()
    .resize(LOGO_UPLOAD.thumbPx, LOGO_UPLOAD.thumbPx, { fit: "cover", position: "centre" })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  return {
    main,
    thumb,
    contentType: "image/webp",
    ext: "webp",
    width: LOGO_UPLOAD.outputPx,
    height: LOGO_UPLOAD.outputPx,
  };
}

export async function processBannerUpload(buffer: Buffer): Promise<ProcessedImage> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // Dimensions are advisory only — always resize/crop on upload.
  validateBannerDimensions({ width, height });

  const main = await sharp(buffer)
    .rotate()
    .resize(BANNER_UPLOAD.outputWidth, BANNER_UPLOAD.outputHeight, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  return {
    main,
    contentType: "image/webp",
    ext: "webp",
    width: BANNER_UPLOAD.outputWidth,
    height: BANNER_UPLOAD.outputHeight,
  };
}
