import { cn } from "@/lib/utils";
import {
  formatLaunchpoolPrize,
  formatTokenTicker,
  type SerializedLaunchpool,
} from "@/lib/launchpool/serialize";

type PrizePoolRowProps = {
  pool: Pick<SerializedLaunchpool, "totalRewardUsd" | "totalRewardAmount" | "rewardTokenSymbol">;
  labelClassName?: string;
  valueClassName?: string;
};

export function PrizePoolRow({ pool, labelClassName, valueClassName }: PrizePoolRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className={cn("text-sm text-muted-foreground", labelClassName)}>
        Prize Pool ({formatTokenTicker(pool.rewardTokenSymbol)})
      </p>
      <p className={cn("shrink-0 text-right font-semibold tabular-nums", valueClassName)}>
        {formatLaunchpoolPrize(pool)}
      </p>
    </div>
  );
}
