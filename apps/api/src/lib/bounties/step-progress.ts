import { getBountyTaskSteps, parseBountyTaskConfig, type BountyTaskStep } from "@/lib/bounty-task-config";

export const QUIZ_STEP_ID = "__quiz__";

export type StepProgressEntry = {
  visitedAt?: string;
  verifiedAt?: string;
  verifyError?: string;
  claimedAt?: string;
};

export type StepProgressMap = Record<string, StepProgressEntry>;

export type BountyStepProof = {
  stepProgress?: StepProgressMap;
  xpClaimedAt?: string;
};

export function parseStepProof(proofJson: unknown): BountyStepProof {
  if (!proofJson || typeof proofJson !== "object") return {};
  const raw = proofJson as Record<string, unknown>;
  const stepProgress =
    raw.stepProgress && typeof raw.stepProgress === "object"
      ? (raw.stepProgress as StepProgressMap)
      : undefined;
  const xpClaimedAt = typeof raw.xpClaimedAt === "string" ? raw.xpClaimedAt : undefined;
  return { stepProgress, xpClaimedAt };
}

export function mergeStepProof(
  existing: unknown,
  patch: Partial<BountyStepProof>
): BountyStepProof {
  const base = parseStepProof(existing);
  return {
    ...base,
    ...patch,
    stepProgress: patch.stepProgress ?? base.stepProgress,
  };
}

export function resolveQuestSteps(input: {
  taskType: string;
  verificationMethod: string;
  verificationConfig?: unknown | null;
  xpReward?: number;
}): BountyTaskStep[] {
  const config = parseBountyTaskConfig(input.verificationConfig);

  const taskSteps = getBountyTaskSteps({
    taskType: input.taskType as Parameters<typeof getBountyTaskSteps>[0]["taskType"],
    verificationConfig: input.verificationConfig,
  });

  if (input.verificationMethod === "QUIZ") {
    const quizXp = config.quizXpPoints ?? input.xpReward ?? 0;
    const quizStep: BountyTaskStep = {
      id: QUIZ_STEP_ID,
      kind: "question",
      instruction: "Complete the quiz",
      buttonLabel: "Start quiz",
      xpPoints: quizXp,
    };
    return [...taskSteps, quizStep];
  }

  if (taskSteps.length > 0) return taskSteps;

  return [
    {
      id: "default-step",
      kind: "custom",
      instruction: "Complete the quest tasks",
      buttonLabel: "Open link",
      xpPoints: input.xpReward ?? 0,
    },
  ];
}

export function stepXpPoints(step: BountyTaskStep): number {
  return typeof step.xpPoints === "number" && step.xpPoints >= 0 ? step.xpPoints : 0;
}

export function totalQuestXp(steps: BountyTaskStep[]): number {
  return steps.reduce((sum, step) => sum + stepXpPoints(step), 0);
}

export function sumStepXpPoints(steps: BountyTaskStep[]): number {
  return totalQuestXp(steps);
}

export function allStepsClaimed(steps: BountyTaskStep[], proof: BountyStepProof): boolean {
  const progress = proof.stepProgress ?? {};
  return steps.every((step) => Boolean(progress[step.id]?.claimedAt));
}

export function allSocialStepsVerified(steps: BountyTaskStep[], proof: BountyStepProof): boolean {
  const progress = proof.stepProgress ?? {};
  return steps.every((step) => {
    if (step.kind !== "social") return true;
    return Boolean(progress[step.id]?.verifiedAt);
  });
}

export function hasOnchainBonusReward(rewardType: string, rewardAmount: string): boolean {
  if (rewardType === "OPN" || rewardType === "TOKEN") {
    const amount = parseFloat(rewardAmount);
    return Number.isFinite(amount) && amount > 0;
  }
  if (rewardType === "CUSTOM") return rewardAmount.trim().length > 0;
  return false;
}
