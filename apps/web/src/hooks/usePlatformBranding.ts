"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export type PlatformBranding = {
  logoUrl: string;
  logoBrandUrl: string;
  heroLogoUrl: string;
  faviconUrl: string;
  platformName: string;
  brandColor: string;
};

const DEFAULTS: PlatformBranding = {
  logoUrl: "/images/logo.png",
  logoBrandUrl: "/images/logo-brand.png",
  heroLogoUrl: "/images/hero-logo.png",
  faviconUrl: "/images/logo.png",
  platformName: "FansPump",
  brandColor: "#2563eb",
};

let cached: PlatformBranding | null = null;
let inflight: Promise<PlatformBranding> | null = null;

export function getDefaultPlatformBranding(): PlatformBranding {
  return { ...DEFAULTS };
}

export async function fetchPlatformBranding(): Promise<PlatformBranding> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = fetch(apiUrl("/api/platform/branding"))
    .then((r) => (r.ok ? r.json() : DEFAULTS))
    .then((data: Partial<PlatformBranding>) => {
      cached = { ...DEFAULTS, ...data };
      return cached;
    })
    .catch(() => {
      cached = { ...DEFAULTS };
      return cached;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function usePlatformBranding() {
  const [branding, setBranding] = useState<PlatformBranding>(cached ?? DEFAULTS);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    void fetchPlatformBranding().then((data) => {
      if (!cancelled) {
        setBranding(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { branding, loading };
}

/** Call after admin saves branding to refresh cached values. */
export function invalidatePlatformBrandingCache() {
  cached = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("platform-branding-updated"));
  }
}
