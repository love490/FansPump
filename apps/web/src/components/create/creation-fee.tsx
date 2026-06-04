import {
  getCreationFeeBreakdown,
  TOKEN_CREATION_FEE_SYMBOL,
} from "@iopn/shared";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreationFeeProps {
  selectedFeatures: number[];
  className?: string;
  compact?: boolean;
}

export function CreationFee({ selectedFeatures, className, compact }: CreationFeeProps) {
  const { lines, total } = getCreationFeeBreakdown(selectedFeatures);

  return (
    <div
      className={cn(
        "rounded-lg border border-iopn-200 bg-iopn-50/80 px-4",
        compact ? "py-2.5" : "py-3",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-iopn-800 mb-2">
        <Coins className="h-4 w-4 shrink-0 text-iopn-600" />
        <span>Creation fees</span>
      </div>
      <ul className="space-y-1 text-sm">
        {lines.map((line) => (
          <li key={line.label} className="flex justify-between gap-4 text-muted-foreground">
            <span>{line.label}</span>
            <span>
              {line.amount} {TOKEN_CREATION_FEE_SYMBOL}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between border-t border-iopn-200 pt-2 text-sm font-semibold text-iopn-800">
        <span>Total</span>
        <span>
          {total} {TOKEN_CREATION_FEE_SYMBOL}
        </span>
      </div>
    </div>
  );
}
