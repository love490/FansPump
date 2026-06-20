import type { BountyTaskType } from "@iopn/database";

export const BOUNTY_TASK_TYPE_IDS = [
  "SOCIAL",
  "ENGAGEMENT",
  "GROWTH",
  "CONTENT",
  "REFERRAL",
  "COMMUNITY",
  "CUSTOM",
] as const satisfies readonly BountyTaskType[];

export const SOCIAL_BOUNTY_ACTION_IDS = [
  "X_FOLLOW",
  "X_LIKE",
  "X_COMMENT",
  "X_QUOTE",
  "TELEGRAM_JOIN",
  "DISCORD_JOIN",
] as const;

export type SocialBountyActionId = (typeof SOCIAL_BOUNTY_ACTION_IDS)[number];

export const SOCIAL_BOUNTY_ACTIONS: { id: SocialBountyActionId; label: string }[] = [
  { id: "X_FOLLOW", label: "Follow account on X" },
  { id: "X_LIKE", label: "Like post on X" },
  { id: "X_COMMENT", label: "Comment on a post" },
  { id: "X_QUOTE", label: "Quote a post" },
  { id: "TELEGRAM_JOIN", label: "Join Telegram" },
  { id: "DISCORD_JOIN", label: "Join Discord" },
];

export type BountyTaskConfig = {
  taskTypes?: BountyTaskType[];
  socialActions?: SocialBountyActionId[];
  requirementType?: string;
  tokenAddress?: string;
  minAmount?: string;
  pairId?: string;
  minLpAmount?: string;
  txHash?: string;
};

export function parseBountyTaskConfig(raw: unknown): BountyTaskConfig {
  if (!raw || typeof raw !== "object") return {};
  return raw as BountyTaskConfig;
}

export function getBountyTaskDisplayLabels(input: {
  taskType: BountyTaskType;
  verificationConfig?: unknown | null;
}): string[] {
  const config = parseBountyTaskConfig(input.verificationConfig);
  const labels: string[] = [];

  for (const actionId of config.socialActions ?? []) {
    const action = SOCIAL_BOUNTY_ACTIONS.find((a) => a.id === actionId);
    if (action) labels.push(action.label);
  }

  const taskTypes =
    config.taskTypes?.length && config.taskTypes.length > 0
      ? config.taskTypes
      : [input.taskType];

  const taskTypeLabels: Record<BountyTaskType, string> = {
    SOCIAL: "Social",
    ENGAGEMENT: "Engagement",
    GROWTH: "Growth",
    CONTENT: "Content",
    REFERRAL: "Referral",
    COMMUNITY: "Community",
    CUSTOM: "Custom",
  };

  for (const type of taskTypes) {
    if (type === "SOCIAL" && (config.socialActions?.length ?? 0) > 0) continue;
    labels.push(taskTypeLabels[type] ?? type);
  }

  return labels.length > 0 ? labels : [taskTypeLabels[input.taskType] ?? input.taskType];
}

export function resolvePrimaryTaskType(taskTypes: BountyTaskType[]): BountyTaskType {
  if (taskTypes.length === 1) return taskTypes[0];
  if (taskTypes.includes("SOCIAL")) return "SOCIAL";
  return taskTypes[0] ?? "CUSTOM";
}

export function mergeBountyVerificationConfig(
  existing: unknown | null | undefined,
  taskTypes: BountyTaskType[],
  socialActions: SocialBountyActionId[]
): BountyTaskConfig | null {
  const base = parseBountyTaskConfig(existing);
  const merged: BountyTaskConfig = { ...base, taskTypes, socialActions };
  if (socialActions.length === 0) delete merged.socialActions;
  if (taskTypes.length === 0) delete merged.taskTypes;
  return Object.keys(merged).length > 0 ? merged : null;
}

export function validateBountyTaskSelection(
  taskTypes: BountyTaskType[],
  socialActions: SocialBountyActionId[]
): string | null {
  if (taskTypes.length === 0) {
    return "Select at least one task type";
  }
  if (taskTypes.includes("SOCIAL") && socialActions.length === 0) {
    return "Select at least one social action (follow, like, join Telegram, etc.)";
  }
  return null;
}
