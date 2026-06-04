"use client";

import { cn } from "@/lib/utils";
import type { SupplyInputUnit } from "@/lib/token-supply";

type AmountUnitToggleProps = {
  unit: SupplyInputUnit;
  onUnitChange: (unit: SupplyInputUnit) => void;
  className?: string;
};

export function AmountUnitToggle({ unit, onUnitChange, className }: AmountUnitToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-input bg-muted/40 p-0.5 text-xs font-medium",
        className
      )}
      role="group"
      aria-label="Input unit"
    >
      <button
        type="button"
        onClick={() => onUnitChange("percent")}
        className={cn(
          "rounded px-2.5 py-1 transition-colors",
          unit === "percent" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        %
      </button>
      <button
        type="button"
        onClick={() => onUnitChange("tokens")}
        className={cn(
          "rounded px-2.5 py-1 transition-colors",
          unit === "tokens" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Tokens
      </button>
    </div>
  );
}
