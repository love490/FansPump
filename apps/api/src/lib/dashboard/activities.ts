export type ActivityPlatform = "FansPump" | "OPN Network";

export type UserActivityKind =
  | "stake"
  | "liquidity"
  | "lock"
  | "token"
  | "quest"
  | "reward";

export type UserActivity = {
  id: string;
  kind: UserActivityKind;
  title: string;
  subtitle?: string;
  amount?: string;
  platform: ActivityPlatform;
  occurredAt: string;
  href?: string;
  /** On-chain transaction, when the action was recorded with one. */
  txHash?: string | null;
};

export function formatActivityAmount(wei: string, decimals = 18, suffix = "") {
  try {
    const n = BigInt(wei);
    if (n === 0n) return suffix ? `0 ${suffix}`.trim() : "0";
    const whole = n / 10n ** BigInt(decimals);
    const frac = n % 10n ** BigInt(decimals);
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
    const base = fracStr ? `${whole}.${fracStr}` : whole.toString();
    return suffix ? `${base} ${suffix}`.trim() : base;
  } catch {
    return wei;
  }
}

export function sortActivities(activities: UserActivity[]) {
  return [...activities].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export const ACTIVITY_KIND_LABELS: Record<UserActivityKind, string> = {
  stake: "Stake",
  liquidity: "Liquidity",
  lock: "Lock",
  token: "Token",
  quest: "Quest",
  reward: "Reward",
};
