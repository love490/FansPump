import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Reliable in-app navigation — avoids dead Next.js Link clicks when overlays or handlers interfere. */
export function handleAppNavigation(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  router: AppRouterInstance,
  onNavigate?: () => void
) {
  onNavigate?.();
  if (
    e.defaultPrevented ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    e.button !== 0
  ) {
    return;
  }
  e.preventDefault();
  router.push(href);
}
