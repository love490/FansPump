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

export type BountyTaskStepKind = "social" | "custom" | "question";

export type BountyTaskStep = {
  id: string;
  kind: BountyTaskStepKind;
  actionId?: SocialBountyActionId;
  instruction: string;
  linkUrl?: string;
  buttonLabel?: string;
  xpPoints?: number;
};

export type BountyTaskConfig = {
  taskTypes?: BountyTaskType[];
  socialActions?: SocialBountyActionId[];
  taskSteps?: BountyTaskStep[];
  quizXpPoints?: number;
  requirementType?: string;
  tokenAddress?: string;
  minAmount?: string;
  pairId?: string;
  minLpAmount?: string;
  txHash?: string;
};

export const SOCIAL_ACTION_META: Record<
  SocialBountyActionId,
  { defaultButton: string; instructionPlaceholder: string; linkPlaceholder: string }
> = {
  X_FOLLOW: {
    defaultButton: "Follow",
    instructionPlaceholder: "Follow @LOVE",
    linkPlaceholder: "https://x.com/LOVE",
  },
  X_LIKE: {
    defaultButton: "Like post",
    instructionPlaceholder: "Like our launch post",
    linkPlaceholder: "https://x.com/user/status/123…",
  },
  X_COMMENT: {
    defaultButton: "Comment",
    instructionPlaceholder: "Comment on our pinned post",
    linkPlaceholder: "https://x.com/user/status/123…",
  },
  X_QUOTE: {
    defaultButton: "Quote post",
    instructionPlaceholder: "Quote our latest post",
    linkPlaceholder: "https://x.com/user/status/123…",
  },
  TELEGRAM_JOIN: {
    defaultButton: "Join Telegram",
    instructionPlaceholder: "Join our Telegram community",
    linkPlaceholder: "https://t.me/yourchannel",
  },
  DISCORD_JOIN: {
    defaultButton: "Join Discord",
    instructionPlaceholder: "Join our Discord server",
    linkPlaceholder: "https://discord.gg/invite",
  },
};

export function parseBountyTaskConfig(raw: unknown): BountyTaskConfig {
  if (!raw || typeof raw !== "object") return {};
  return raw as BountyTaskConfig;
}

export function createDefaultSocialStep(actionId: SocialBountyActionId): BountyTaskStep {
  const meta = SOCIAL_ACTION_META[actionId];
  return {
    id: `social-${actionId}`,
    kind: "social",
    actionId,
    instruction: "",
    linkUrl: "",
    buttonLabel: meta.defaultButton,
  };
}

export function createEmptyCustomStep(kind: "custom" | "question" = "custom"): BountyTaskStep {
  return {
    id: `step-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    instruction: "",
    linkUrl: "",
    buttonLabel: kind === "question" ? "Next" : "Open link",
  };
}

export function getBountyTaskSteps(input: {
  taskType: BountyTaskType;
  verificationConfig?: unknown | null;
}): BountyTaskStep[] {
  const config = parseBountyTaskConfig(input.verificationConfig);
  if (config.taskSteps?.length) return config.taskSteps;

  const steps: BountyTaskStep[] = [];
  for (const actionId of config.socialActions ?? []) {
    const meta = SOCIAL_ACTION_META[actionId];
    steps.push({
      id: `social-${actionId}`,
      kind: "social",
      actionId,
      instruction: meta.instructionPlaceholder,
      buttonLabel: meta.defaultButton,
    });
  }
  return steps;
}

export function deriveTaskTypes(
  socialActions: SocialBountyActionId[],
  taskSteps: BountyTaskStep[]
): BountyTaskType[] {
  const types: BountyTaskType[] = [];
  if (socialActions.length > 0) types.push("SOCIAL");
  if (taskSteps.some((s) => s.kind === "custom")) types.push("CUSTOM");
  if (types.length === 0) types.push("CUSTOM");
  return types;
}

export function getBountyTaskDisplayLabels(input: {
  taskType: BountyTaskType;
  verificationMethod?: string;
  verificationConfig?: unknown | null;
}): string[] {
  const steps = getBountyTaskSteps(input);
  const labels: string[] = [];

  if (steps.length > 0) {
    for (const step of steps) {
      if (step.kind === "social") {
        const action = SOCIAL_BOUNTY_ACTIONS.find((a) => a.id === step.actionId);
        labels.push(action?.label ?? (step.instruction.trim() || stepButtonLabel(step)));
      } else if (step.kind === "custom") {
        labels.push(step.instruction.trim() || "Custom task");
      }
    }
  }

  const config = parseBountyTaskConfig(input.verificationConfig);
  if (input.verificationMethod === "QUIZ" || config.quizXpPoints) {
    labels.push("Quiz");
  }

  if (labels.length > 0) return labels;

  const fallback = BOUNTY_TASK_TYPES.find((t) => t.id === input.taskType)?.label;
  return fallback ? [fallback] : [input.taskType];
}

export function stepButtonLabel(step: BountyTaskStep): string {
  if (step.buttonLabel?.trim()) return step.buttonLabel.trim();
  if (step.kind === "social" && step.actionId) {
    return SOCIAL_ACTION_META[step.actionId].defaultButton;
  }
  if (step.kind === "question") return "Next";
  return "Open link";
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
  options?: { taskSteps?: BountyTaskStep[]; onchain?: Record<string, unknown> | null }
): BountyTaskConfig | null {
  const base = parseBountyTaskConfig(existing);
  const taskSteps = options?.taskSteps?.length ? options.taskSteps : undefined;
  const merged: BountyTaskConfig = {
    ...base,
    ...options?.onchain,
    taskTypes,
    socialActions: socialActions.length > 0 ? socialActions : undefined,
    taskSteps,
  };
  if (!merged.socialActions?.length) delete merged.socialActions;
  if (!merged.taskTypes?.length) delete merged.taskTypes;
  if (!merged.taskSteps?.length) delete merged.taskSteps;
  return Object.keys(merged).length > 0 ? merged : null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateBountyTaskSelection(
  socialActions: SocialBountyActionId[],
  taskSteps: BountyTaskStep[] = [],
  options?: { hasQuiz?: boolean }
): string | null {
  const customSteps = taskSteps.filter((s) => s.kind === "custom");
  const hasSocial = socialActions.length > 0;
  const hasCustom = customSteps.length > 0;
  const hasQuiz = options?.hasQuiz ?? false;

  if (!hasSocial && !hasCustom && !hasQuiz) {
    return "Add at least one task: social action, custom step, or quiz question";
  }

  for (const step of taskSteps) {
    if (!step.instruction.trim()) {
      return "Each task needs a short instruction (e.g. Follow @LOVE)";
    }
    if (step.kind === "social") {
      if (!step.linkUrl?.trim()) {
        return `Add a link for ${SOCIAL_BOUNTY_ACTIONS.find((a) => a.id === step.actionId)?.label ?? "this social task"}`;
      }
      if (!isValidHttpUrl(step.linkUrl.trim())) {
        return "Task links must start with http:// or https://";
      }
    }
    if ((step.kind === "custom" || step.kind === "question") && step.linkUrl?.trim()) {
      if (!isValidHttpUrl(step.linkUrl.trim())) {
        return "Task links must start with http:// or https://";
      }
    }
    if (typeof step.xpPoints !== "number" || !Number.isInteger(step.xpPoints) || step.xpPoints < 1) {
      return "Set XP points (1 or more) for each task step";
    }
  }

  for (const actionId of socialActions) {
    const step = taskSteps.find((s) => s.kind === "social" && s.actionId === actionId);
    if (!step) {
      return "Configure each selected social action with instructions and a link";
    }
  }

  return null;
}

export function sumStepXpPoints(steps: BountyTaskStep[]): number {
  return steps.reduce((sum, step) => sum + (step.xpPoints ?? 0), 0);
}

export function syncSocialTaskSteps(
  socialActions: SocialBountyActionId[],
  currentSteps: BountyTaskStep[]
): BountyTaskStep[] {
  const customSteps = currentSteps.filter((s) => s.kind !== "social");
  const socialSteps = socialActions.map((actionId) => {
    const existing = currentSteps.find((s) => s.kind === "social" && s.actionId === actionId);
    return existing ?? createDefaultSocialStep(actionId);
  });
  return [...socialSteps, ...customSteps];
}
