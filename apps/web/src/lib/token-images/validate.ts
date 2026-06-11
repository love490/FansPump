import { BANNER_UPLOAD, LOGO_UPLOAD } from "@/lib/token-images/constants";

export type ImageDimensions = { width: number; height: number };

export function readImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}

export function readImageDimensionsFromUrl(src: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function aspectRatio(width: number, height: number) {
  return width / height;
}

function isNearRatio(width: number, height: number, target: number, tolerance: number) {
  const ratio = aspectRatio(width, height);
  return Math.abs(ratio - target) / target <= tolerance;
}

export function validateLogoDimensions(dim: ImageDimensions): string | null {
  const { width, height } = dim;
  const short = Math.min(width, height);
  const long = Math.max(width, height);

  if (!isNearRatio(width, height, LOGO_UPLOAD.aspectRatio, LOGO_UPLOAD.aspectTolerance)) {
    return "Logo must be square (1:1 aspect ratio). Upload a square image such as 1024×1024 px.";
  }
  if (short < LOGO_UPLOAD.minPx) {
    return `Logo is too small (${width}×${height} px). Minimum size is ${LOGO_UPLOAD.minPx}×${LOGO_UPLOAD.minPx} px.`;
  }
  if (long > LOGO_UPLOAD.maxPx) {
    return `Logo is too large (${width}×${height} px). Maximum size is ${LOGO_UPLOAD.maxPx}×${LOGO_UPLOAD.maxPx} px.`;
  }
  return null;
}

export function validateBannerDimensions(dim: ImageDimensions): {
  error: string | null;
  needsCrop: boolean;
  warning: string | null;
} {
  const { width, height } = dim;

  if (width < BANNER_UPLOAD.minWidth || height < BANNER_UPLOAD.minHeight) {
    return {
      error: `Banner is too small (${width}×${height} px). Minimum size is ${BANNER_UPLOAD.minWidth}×${BANNER_UPLOAD.minHeight} px.`,
      needsCrop: false,
      warning: null,
    };
  }
  if (width > BANNER_UPLOAD.maxWidth || height > BANNER_UPLOAD.maxHeight) {
    return {
      error: `Banner is too large (${width}×${height} px). Maximum size is ${BANNER_UPLOAD.maxWidth}×${BANNER_UPLOAD.maxHeight} px.`,
      needsCrop: false,
      warning: null,
    };
  }

  const ratioOk = isNearRatio(width, height, BANNER_UPLOAD.aspectRatio, BANNER_UPLOAD.aspectTolerance);
  if (!ratioOk) {
    return {
      error: null,
      needsCrop: true,
      warning: `Banner aspect ratio is ${(width / height).toFixed(2)}:1 — crop to 3:1 before uploading.`,
    };
  }

  return { error: null, needsCrop: false, warning: null };
}

/** Center crop region with 3:1 aspect ratio inside image bounds. */
export function centerCrop3x1(dim: ImageDimensions): { x: number; y: number; width: number; height: number } {
  const targetRatio = BANNER_UPLOAD.aspectRatio;
  let cropW = dim.width;
  let cropH = Math.round(cropW / targetRatio);

  if (cropH > dim.height) {
    cropH = dim.height;
    cropW = Math.round(cropH * targetRatio);
  }

  return {
    x: Math.round((dim.width - cropW) / 2),
    y: Math.round((dim.height - cropH) / 2),
    width: cropW,
    height: cropH,
  };
}

export async function cropImageToBlob(
  file: File,
  crop: { x: number; y: number; width: number; height: number },
  mime: string = "image/webp",
  quality = 0.9
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");

  ctx.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      mime,
      quality
    );
  });
}
