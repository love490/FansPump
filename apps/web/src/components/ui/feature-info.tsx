"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureInfoProps {
  title: string;
  description: string;
  className?: string;
}

export function FeatureInfo({ title, description, className }: FeatureInfoProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        aria-label={`Learn about ${title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border border-iopn-200 bg-iopn-50 text-iopn-600",
          "transition-colors hover:bg-iopn-100 hover:border-iopn-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <CircleHelp className="h-3 w-3" strokeWidth={2.25} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={title}
          className="absolute right-0 top-7 z-50 w-72 rounded-lg border border-border bg-card p-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-iopn-600">
            Locked permanently after deploy
          </p>
        </div>
      )}
    </div>
  );
}
