import { BANNER_UPLOAD, LOGO_UPLOAD } from "@/lib/token-images/constants";

export type ImageDimensions = { width: number; height: number };

function isNearRatio(width: number, height: number, target: number, tolerance: number) {
  const ratio = width / height;
  return Math.abs(ratio - target) / target <= tolerance;
}

export function validateLogoDimensions(dim: ImageDimensions): {
  error: string | null;
  warning: string | null;
} {
  const { width, height } = dim;
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const warnings: string[] = [];

  if (!isNearRatio(width, height, LOGO_UPLOAD.aspectRatio, LOGO_UPLOAD.aspectTolerance)) {
    warnings.push(
      `Non-square image (${width}×${height} px). It will be center-cropped to square. Recommended: ${LOGO_UPLOAD.recommendedPx}×${LOGO_UPLOAD.recommendedPx} px.`
    );
  }
  if (short < LOGO_UPLOAD.minPx) {
    warnings.push(
      `Smaller than recommended ${LOGO_UPLOAD.recommendedPx}×${LOGO_UPLOAD.recommendedPx} px (${width}×${height} px). It will be upscaled on upload.`
    );
  }
  if (long > LOGO_UPLOAD.maxPx) {
    warnings.push(
      `Larger than recommended ${LOGO_UPLOAD.maxPx}×${LOGO_UPLOAD.maxPx} px — will be resized on upload.`
    );
  }

  return { error: null, warning: warnings.length ? warnings.join(" ") : null };
}

export function validateBannerDimensions(dim: ImageDimensions): {
  error: string | null;
  needsCrop: boolean;
  warning: string | null;
} {
  const { width, height } = dim;
  const warnings: string[] = [];

  if (width < BANNER_UPLOAD.minWidth || height < BANNER_UPLOAD.minHeight) {
    warnings.push(
      `Smaller than recommended ${BANNER_UPLOAD.recommendedWidth}×${BANNER_UPLOAD.recommendedHeight} px (${width}×${height} px). It will be upscaled on upload.`
    );
  }
  if (width > BANNER_UPLOAD.maxWidth || height > BANNER_UPLOAD.maxHeight) {
    warnings.push(
      `Larger than recommended ${BANNER_UPLOAD.maxWidth}×${BANNER_UPLOAD.maxHeight} px — will be resized on upload.`
    );
  }

  const ratioOk = isNearRatio(width, height, BANNER_UPLOAD.aspectRatio, BANNER_UPLOAD.aspectTolerance);
  if (!ratioOk) {
    warnings.push(
      `Aspect ratio is ${(width / height).toFixed(2)}:1 (recommended 3:1). It will be center-cropped on upload.`
    );
  }

  return { error: null, needsCrop: false, warning: warnings.length ? warnings.join(" ") : null };
}
