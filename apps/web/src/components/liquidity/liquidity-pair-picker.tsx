"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SwapDropdownPortal } from "@/components/swap/swap-dropdown-portal";
import { TokenLogo } from "@/components/tokens/token-logo";
import {
  LIQUIDITY_PAIR_OPTIONS,
  type LiquidityPairId,
} from "@/lib/liquidity/pair-tokens";

type LiquidityPairPickerProps = {
  value: LiquidityPairId;
  onChange: (id: LiquidityPairId) => void;
  rowAnchorRef?: React.RefObject<HTMLElement | null>;
};

export function LiquidityPairPicker({ value, onChange, rowAnchorRef }: LiquidityPairPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = LIQUIDITY_PAIR_OPTIONS.find((p) => p.id === value) ?? LIQUIDITY_PAIR_OPTIONS[0];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted/50"
      >
        <TokenLogo symbol={selected.symbol} name={selected.label} layout="fixed" size={28} className="rounded-full" />
        <span>{selected.symbol}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      <SwapDropdownPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={rowAnchorRef ?? triggerRef}
        panelRef={panelRef}
        anchorMode={rowAnchorRef ? "card" : "pill"}
      >
        <div className="max-h-[min(280px,40vh)] space-y-1 overflow-y-auto overscroll-contain p-2">
          {LIQUIDITY_PAIR_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                value === option.id && "border-primary/40 bg-primary/5"
              )}
            >
              <TokenLogo symbol={option.symbol} name={option.label} layout="fixed" size={32} className="rounded-full" />
              <div>
                <p className="font-semibold">{option.symbol}</p>
                <p className="text-xs text-muted-foreground">{option.label}</p>
              </div>
            </button>
          ))}
        </div>
      </SwapDropdownPortal>
    </>
  );
}
