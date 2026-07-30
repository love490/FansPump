"use client";

import { Label } from "@/components/ui/label";
import { formatLiquidityAmountFromWei } from "@/lib/liquidity/format-amount";
import { shortenAddress } from "@/lib/utils";
import type { SelectableLpToken } from "@/hooks/liquidity/useSelectableLpTokens";

type LpTokenSelectProps = {
  id: string;
  label: string;
  options: SelectableLpToken[];
  value: string;
  onChange: (lpToken: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function LpTokenSelect({
  id,
  label,
  options,
  value,
  onChange,
  loading = false,
  disabled = false,
}: LpTokenSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">
          {loading
            ? "Scanning wallet for LP tokens…"
            : options.length === 0
              ? "No LP tokens found in your wallet"
              : "Select an LP token"}
        </option>
        {options.map((option) => (
          <option key={option.lpToken} value={option.lpToken}>
            {option.tokenSymbol} / {option.pairLabel} —{" "}
            {formatLiquidityAmountFromWei(option.lpBalance, option.lpDecimals)} LP (
            {shortenAddress(option.lpToken, 4)})
          </option>
        ))}
      </select>
      {options.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {options.length} LP token{options.length === 1 ? "" : "s"} detected in your wallet
        </p>
      )}
    </div>
  );
}
