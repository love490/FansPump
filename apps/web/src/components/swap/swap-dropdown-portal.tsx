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
  minWidth = 320
) {
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: minWidth });

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, minWidth);
    const margin = 8;
    const maxHeight = Math.min(window.innerHeight * 0.7, 420);

    let top = rect.bottom + margin;
    let left = Math.min(rect.right - width, window.innerWidth - width - margin);
    left = Math.max(margin, left);

    if (top + maxHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - maxHeight - margin);
    }

    setPosition({ top, left, width });
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
  minWidth = 320,
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

  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="fixed z-[200] flex max-h-[min(70vh,420px)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
