"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Paths where back navigation is hidden (top-level landing). */
const HIDE_BACK_PATHS = new Set(["/"]);

export function BackNavButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || HIDE_BACK_PATHS.has(pathname)) {
    return null;
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        className
      )}
      onClick={goBack}
      aria-label="Go back to previous page"
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
    </Button>
  );
}
