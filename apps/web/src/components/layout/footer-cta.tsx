"use client";

import { usePathname } from "next/navigation";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";

/** Routes that are the user's own wallet space, where platform marketing is noise. */
const HIDDEN_PREFIXES = ["/dashboard", "/profile", "/settings", "/watchlist"];

export function FooterCta() {
  const pathname = usePathname() ?? "";
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (hidden) return null;
  return <LandingCtaSection className="border-b-0" />;
}
