"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AmountUnitToggle } from "@/components/create/amount-unit-toggle";
import {
  formatTokenAmountFromWei,
  percentFromSupplyWei,
  toSupplyWei,
  type SupplyInputUnit,
} from "@/lib/token-supply";

type SupplyAmountInputProps = {
  label: string;
  supply: string;
  unit: SupplyInputUnit;
  onUnitChange: (unit: SupplyInputUnit) => void;
  value: string;
  onChange: (value: string) => void;
  description?: string;
};

export function SupplyAmountInput({
  label,
  supply,
  unit,
  onUnitChange,
  value,
  onChange,
  description,
}: SupplyAmountInputProps) {
  const resolvedWei = useMemo(() => toSupplyWei(supply, unit, value), [supply, unit, value]);

  const hint = useMemo(() => {
    if (!value.trim() || resolvedWei === 0n) return null;
    if (unit === "percent") {
      return `≈ ${formatTokenAmountFromWei(resolvedWei)} tokens (${percentFromSupplyWei(supply, resolvedWei)}% of supply)`;
    }
    return `≈ ${percentFromSupplyWei(supply, resolvedWei)}% of total supply`;
  }, [supply, unit, value, resolvedWei]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="mb-0">{label}</Label>
        <AmountUnitToggle unit={unit} onUnitChange={onUnitChange} />
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={unit === "percent" ? "e.g. 1" : "e.g. 50000"}
        inputMode="decimal"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
