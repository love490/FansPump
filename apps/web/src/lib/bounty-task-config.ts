import type { BountyTaskType } from "@/lib/bounties";
import { BOUNTY_TASK_TYPES } from "@/lib/bounties";

export const SOCIAL_BOUNTY_ACTIONS = [
  { id: "X_FOLLOW", label: "Follow account on X" },
  { id: "X_LIKE", label: "Like post on X" },
  { id: "X_COMMENT", label: "Comment on a post" },
  { id: "X_QUOTE", label: "Quote a post" },
  { id: "TELEGRAM_JOIN", label: "Join Telegram" },
  { id: "DISCORD_JOIN", label: "Join Discord" },
] as const;

export type SocialBountyActionId = (typeof SOCIAL_BOUNTY_ACTIONS)[number]["id"];

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

  for (const type of taskTypes) {
    if (type === "SOCIAL" && (config.socialActions?.length ?? 0) > 0) continue;
    const label = BOUNTY_TASK_TYPES.find((t) => t.id === type)?.label;
    if (label) labels.push(label);
  }

  return labels.length > 0
    ? labels
    : [BOUNTY_TASK_TYPES.find((t) => t.id === input.taskType)?.label ?? input.taskType];
}

export function resolvePrimaryTaskType(taskTypes: BountyTaskType[]): BountyTaskType {
  if (taskTypes.length === 1) return taskTypes[0];
  if (taskTypes.includes("SOCIAL")) return "SOCIAL";
  return taskTypes[0] ?? "CUSTOM";
}

export function mergeBountyVerificationConfig(
  existing: unknown | null | undefined,
  taskTypes: BountyTaskType[],
  socialActions: SocialBountyActionId[],
  onchain?: Record<string, unknown> | null
): BountyTaskConfig | null {
  const base = parseBountyTaskConfig(existing);
  const merged: BountyTaskConfig = {
    ...base,
    ...onchain,
    taskTypes,
    socialActions: socialActions.length > 0 ? socialActions : undefined,
  };
  if (!merged.socialActions?.length) delete merged.socialActions;
  if (!merged.taskTypes?.length) delete merged.taskTypes;
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
