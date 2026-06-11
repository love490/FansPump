/** Token logo upload & display specs (1:1 square). */
export const LOGO_UPLOAD = {
  minPx: 512,
  recommendedPx: 1024,
  highQualityPx: 1536,
  maxPx: 2048,
  aspectRatio: 1,
  /** Allow ~2% tolerance for near-square uploads. */
  aspectTolerance: 0.02,
  outputPx: 1024,
  thumbPx: 256,
} as const;

/** Token banner upload & display specs (3:1 wide). */
export const BANNER_UPLOAD = {
  minWidth: 1200,
  minHeight: 400,
  recommendedWidth: 1500,
  recommendedHeight: 500,
  highQualityWidth: 1800,
  highQualityHeight: 600,
  maxWidth: 2400,
  maxHeight: 800,
  aspectRatio: 3,
  aspectTolerance: 0.08,
  outputWidth: 1500,
  outputHeight: 500,
} as const;

/** Responsive display heights for banners (px). */
export const BANNER_DISPLAY_HEIGHT = {
  mobile: 160,
  tablet: 220,
  desktop: 280,
  large: 320,
} as const;

/** Responsive display sizes for logos (px). */
export const LOGO_DISPLAY_SIZE = {
  mobile: 56,
  tablet: 60,
  desktop: 64,
  large: 72,
} as const;

export const TOKEN_LOGO_PLACEHOLDER = "/images/token-placeholder.svg";
export const TOKEN_BANNER_PLACEHOLDER = "/images/token-banner-placeholder.svg";

export const IMAGE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
