"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export function useDropdownPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  minWidth = 300
) {
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: minWidth });

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, minWidth);
    const margin = 6;
    const panelMaxHeight = Math.min(window.innerHeight * 0.55, 380);

    // Drop directly below the trigger button, right-aligned with the pill
    const top = rect.bottom + margin;
    let left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    // Only flip above if there is not enough room below
    let finalTop = top;
    if (top + panelMaxHeight > window.innerHeight - margin) {
      const above = rect.top - panelMaxHeight - margin;
      if (above >= margin) finalTop = above;
    }

    setPosition({ top: finalTop, left, width });
  }, [anchorRef, minWidth]);

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
  minWidth?: number;
};

export function SwapDropdownPortal({
  open,
  onClose,
  anchorRef,
  panelRef,
  children,
  minWidth = 300,
}: SwapDropdownPortalProps) {
  const position = useDropdownPosition(anchorRef, open, minWidth);
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

  return createPortal(
    <div
      ref={panelRef}
      role="listbox"
      className="fixed z-[200] flex max-h-[min(55vh,380px)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
