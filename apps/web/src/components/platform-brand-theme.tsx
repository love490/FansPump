"use client";

import { useEffect } from "react";
import { fetchPlatformBranding } from "@/hooks/usePlatformBranding";

function hexToHslChannels(hex: string): string | null {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Applies admin-configured brand color to CSS variables site-wide. */
export function PlatformBrandTheme() {
  useEffect(() => {
    let cancelled = false;

    const apply = () => {
      void fetchPlatformBranding().then((branding) => {
        if (cancelled) return;
        const channels = hexToHslChannels(branding.brandColor ?? "#2563eb");
        if (channels) {
          document.documentElement.style.setProperty("--primary", channels);
        }
      });
    };

    apply();
    window.addEventListener("platform-branding-updated", apply);
    return () => {
      cancelled = true;
      window.removeEventListener("platform-branding-updated", apply);
    };
  }, []);

  return null;
}
