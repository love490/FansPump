"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { handleAppNavigation } from "@/lib/navigation/app-navigate";

type AppLinkProps = ComponentProps<typeof Link> & {
  onNavigate?: () => void;
};

/** In-app link with explicit router.push for reliable client navigation. */
export function AppLink({ href, onClick, onNavigate, prefetch = true, ...props }: AppLinkProps) {
  const router = useRouter();
  const path = typeof href === "string" ? href : href.pathname ?? "/";

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={(e) => {
        onClick?.(e);
        if (typeof path === "string" && path.startsWith("/")) {
          handleAppNavigation(e, path, router, onNavigate);
        }
      }}
      {...props}
    />
  );
}
