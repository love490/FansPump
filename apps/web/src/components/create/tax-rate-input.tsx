"use client";

import { useMemo } from "react";
import { BUY_TAX_OPTIONS, MAX_TAX_BPS, SELL_TAX_OPTIONS } from "@iopn/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AmountUnitToggle } from "@/components/create/amount-unit-toggle";
import {
  bpsToTaxPerToken,
  bpsToPercentString,
  percentToBps,
  taxPerTokenToBps,
  type SupplyInputUnit,
} from "@/lib/token-supply";
import { formatTaxBps } from "@/lib/utils";

type TaxRateInputProps = {
  label: string;
  kind: "buy" | "sell";
  unit: SupplyInputUnit;
  onUnitChange: (unit: SupplyInputUnit) => void;
  bps: number;
  onBpsChange: (bps: number) => void;
  percentValue: string;
  onPercentValueChange: (v: string) => void;
  tokensPerTransferValue: string;
  onTokensPerTransferValueChange: (v: string) => void;
};

export function TaxRateInput({
  label,
  kind,
  unit,
  onUnitChange,
  bps,
  onBpsChange,
  percentValue,
  onPercentValueChange,
  tokensPerTransferValue,
  onTokensPerTransferValueChange,
}: TaxRateInputProps) {
  const options = kind === "buy" ? BUY_TAX_OPTIONS : SELL_TAX_OPTIONS;
  const isPreset = (options as readonly number[]).includes(bps);

  const effectiveBps = useMemo(() => {
    if (unit === "percent") return percentToBps(percentValue);
    return taxPerTokenToBps(tokensPerTransferValue);
  }, [unit, percentValue, tokensPerTransferValue]);

  const overMax = effectiveBps > MAX_TAX_BPS;

  function switchUnit(next: SupplyInputUnit) {
    if (next === unit) return;
    if (next === "tokens") {
      onTokensPerTransferValueChange(bpsToTaxPerToken(bps));
    } else {
      onPercentValueChange(bpsToPercentString(bps));
    }
    onUnitChange(next);
  }

  function handlePercentSelect(optionBps: number) {
    onBpsChange(optionBps);
    onPercentValueChange(bpsToPercentString(optionBps));
  }

  function handlePercentInput(raw: string) {
    onPercentValueChange(raw);
    onBpsChange(percentToBps(raw));
  }

  function handleTokensInput(raw: string) {
    onTokensPerTransferValueChange(raw);
    onBpsChange(taxPerTokenToBps(raw));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="mb-0">{label}</Label>
        <AmountUnitToggle unit={unit} onUnitChange={switchUnit} />
      </div>

      {unit === "percent" ? (
        <>
          <select
            className="flex h-10 w-full rounded-md border px-3 text-sm"
            value={isPreset ? String(bps) : "custom"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") return;
              handlePercentSelect(Number(v));
            }}
          >
            {options.map((b) => (
              <option key={b} value={b} disabled={b > MAX_TAX_BPS}>
                {formatTaxBps(b)}
              </option>
            ))}
            <option value="custom">Custom %</option>
          </select>
          {!isPreset && (
            <Input
              value={percentValue}
              onChange={(e) => handlePercentInput(e.target.value)}
              placeholder="Custom % (max 5)"
              inputMode="decimal"
            />
          )}
          <p className="text-xs text-muted-foreground">
            {formatTaxBps(effectiveBps)} per transfer ({effectiveBps} bps)
          </p>
        </>
      ) : (
        <>
          <Input
            value={tokensPerTransferValue}
            onChange={(e) => handleTokensInput(e.target.value)}
            placeholder="Tokens taxed per 1 token transferred"
            inputMode="decimal"
          />
          <p className="text-xs text-muted-foreground">
            ≈ {formatTaxBps(effectiveBps)} ({effectiveBps} bps) · max 5%
          </p>
        </>
      )}

      {overMax && <p className="text-xs text-red-600">Tax cannot exceed 5% (500 bps).</p>}
    </div>
  );
}
