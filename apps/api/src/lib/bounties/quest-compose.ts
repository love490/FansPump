import {
  deriveTaskTypes,
  mergeBountyVerificationConfig,
  resolvePrimaryTaskType,
  type BountyTaskStep,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";
import type { BountyTaskType, BountyVerificationMethod } from "@iopn/database";
import { sumStepXpPoints } from "@/lib/bounties/step-progress";

export function composeBountyQuest(input: {
  socialActions: SocialBountyActionId[];
  taskSteps: BountyTaskStep[];
  quizXpPoints?: number;
  hasQuiz: boolean;
  baseVerificationMethod?: BountyVerificationMethod;
  existingConfig?: unknown | null;
}): {
  verificationMethod: BountyVerificationMethod;
  verificationConfig: ReturnType<typeof mergeBountyVerificationConfig>;
  taskTypes: BountyTaskType[];
  xpReward: number;
  primaryTaskType: BountyTaskType;
} {
  const taskTypes = deriveTaskTypes(input.socialActions, input.taskSteps);
  let verificationMethod: BountyVerificationMethod = input.baseVerificationMethod ?? "MANUAL";
  if (input.hasQuiz && verificationMethod !== "ONCHAIN") {
    verificationMethod = "QUIZ";
  }

  let verificationConfig = mergeBountyVerificationConfig(
    input.existingConfig ?? null,
    taskTypes,
    input.socialActions,
    { taskSteps: input.taskSteps }
  );

  let xpReward = sumStepXpPoints(input.taskSteps);
  if (input.hasQuiz) {
    const quizXp = input.quizXpPoints ?? 0;
    verificationConfig = {
      ...(verificationConfig ?? {}),
      quizXpPoints: quizXp,
      taskTypes,
      ...(input.socialActions.length > 0 ? { socialActions: input.socialActions } : {}),
      ...(input.taskSteps.length > 0 ? { taskSteps: input.taskSteps } : {}),
    };
    xpReward += quizXp;
  }

  return {
    verificationMethod,
    verificationConfig,
    taskTypes,
    xpReward,
    primaryTaskType: resolvePrimaryTaskType(taskTypes),
  };
}
