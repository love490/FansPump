"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Thin top bar — shows immediately when an in-app link is clicked. */
export function NavigationProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    function onNavigateIntent(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const el = event.target;
      if (!(el instanceof Element)) return;
      const anchor = el.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.getAttribute("target") === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (/^https?:\/\//i.test(href)) return;

      const nextPath = href.split("?")[0].split("#")[0];
      const currentPath = pathname ?? "";
      if (nextPath === currentPath) return;

      document.dispatchEvent(new CustomEvent("app:navigate-intent"));
      setPending(true);
    }

    document.addEventListener("click", onNavigateIntent, true);
    return () => document.removeEventListener("click", onNavigateIntent, true);
  }, [pathname]);

  if (!pending) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-0.5 bg-primary/15"
      aria-hidden
    >
      <div className="h-full w-1/3 animate-[navigation-progress_0.8s_ease-in-out_infinite] bg-primary" />
    </div>
  );
}
