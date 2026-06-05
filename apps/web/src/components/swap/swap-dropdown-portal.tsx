"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export type DropdownAnchorMode = "card" | "pill";

export function useDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  mode: DropdownAnchorMode = "card"
) {
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 300 });

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const margin = 8;

    if (mode === "card") {
      // Full swap card — same origin for From and To, drops downward from the card top
      setPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
      return;
    }

    // Pill trigger fallback (non-swap contexts)
    const width = Math.max(rect.width, 280);
    const top = rect.bottom + margin;
    let left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    setPosition({ top, left, width });
  }, [anchorRef, mode]);

  useEffect(() => {
    if (!open) return;
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

  if (!mounted || !open || typeof document === "undefined") return null;

  const cardAnchored = anchorMode === "card";
  const maxHeight = cardAnchored
    ? `min(calc(100vh - ${position.top}px - 16px), 480px)`
    : "min(50vh, 360px)";

  return createPortal(
    <div
      ref={panelRef}
      role="listbox"
      className={cn(
        "fixed z-[200] flex flex-col overflow-hidden border border-border bg-background shadow-xl",
        cardAnchored ? "rounded-xl" : "max-h-[min(50vh,360px)] rounded-xl"
      )}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: cardAnchored ? maxHeight : undefined,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
