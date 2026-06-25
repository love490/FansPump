import { z } from "zod";
import { QUIZ_OPTION_KEYS } from "./types";

const quizOptionSchema = z.object({
  key: z.enum(QUIZ_OPTION_KEYS),
  text: z.string().min(1).max(500),
});

const quizQuestionSchema = z.object({
  questionText: z.string().min(1).max(2000),
  options: z.array(quizOptionSchema).min(2).max(6),
  correctKey: z.enum(QUIZ_OPTION_KEYS),
});

export const quizInputSchema = z.object({
  settings: z
    .object({
      showCorrectOnFailure: z.boolean().optional(),
      unlimitedAttempts: z.boolean().optional(),
      requireWallet: z.boolean().optional(),
      oneRewardPerWallet: z.boolean().optional(),
      passingScorePercent: z.number().int().min(1).max(100).optional(),
    })
    .optional()
    .default({}),
  questions: z.array(quizQuestionSchema).min(1).max(50),
});

export const quizSubmitSchema = z.object({
  walletAddress: z.string(),
  message: z.string(),
  signature: z.string(),
  answers: z.record(z.string(), z.enum(QUIZ_OPTION_KEYS)),
});
