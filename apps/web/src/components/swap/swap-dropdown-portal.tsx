"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export type DropdownAnchorMode = "card" | "pill";

function computeDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  mode: DropdownAnchorMode
): DropdownPosition | null {
  const el = anchorRef.current;
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const margin = 8;

  if (mode === "card") {
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
    };
  }

  const width = Math.max(rect.width, 280);
  const top = rect.bottom + margin;
  let left = rect.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  return { top, left, width };
}

export function useDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  mode: DropdownAnchorMode = "card"
) {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  const update = useCallback(() => {
    setPosition(computeDropdownPosition(anchorRef, mode));
  }, [anchorRef, mode]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return position;
}

type SwapDropdownPortalProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  anchorMode?: DropdownAnchorMode;
};

export function SwapDropdownPortal({
  open,
  onClose,
  anchorRef,
  panelRef,
  children,
  anchorMode = "card",
}: SwapDropdownPortalProps) {
  const position = useDropdownPosition(anchorRef, open, anchorMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, anchorRef, panelRef]);

  useEffect(() => {
    if (!open) return;
    function onNavigateIntent() {
      onClose();
    }
    document.addEventListener("app:navigate-intent", onNavigateIntent);
    return () => document.removeEventListener("app:navigate-intent", onNavigateIntent);
  }, [open, onClose]);

  if (!mounted || !open || !position || typeof document === "undefined") return null;

  const cardAnchored = anchorMode === "card";
  const maxHeight = cardAnchored
    ? `min(calc(100vh - ${position.top}px - 16px), 480px)`
    : "min(50vh, 360px)";

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] cursor-default bg-black/20"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="listbox"
        className={cn(
          "fixed z-[201] flex flex-col overflow-hidden border border-border bg-background shadow-xl",
          cardAnchored ? "rounded-xl" : "max-h-[min(50vh,360px)] rounded-xl"
        )}
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          maxHeight: cardAnchored ? maxHeight : undefined,
        }}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
