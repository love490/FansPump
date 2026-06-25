import type { Prisma, PrismaClient } from "@iopn/database";
import type { QuizInput, PublicQuiz, QuizAnswerResult, QuizSubmitResult } from "./types";
import { normalizeQuizInput } from "./validate";

type Db = PrismaClient | Prisma.TransactionClient;

const quizInclude = {
  questions: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      options: { orderBy: { sortOrder: "asc" as const } },
    },
  },
} satisfies Prisma.BountyQuizInclude;

export async function createQuizForBounty(
  db: Db,
  bountyId: string,
  rawQuiz: QuizInput
) {
  const quiz = normalizeQuizInput(rawQuiz);

  const row = await db.bountyQuiz.create({
    data: {
      bountyId,
      showCorrectOnFailure: quiz.settings.showCorrectOnFailure ?? false,
      unlimitedAttempts: quiz.settings.unlimitedAttempts ?? true,
      requireWallet: quiz.settings.requireWallet ?? true,
      oneRewardPerWallet: quiz.settings.oneRewardPerWallet ?? true,
      passingScorePercent: quiz.settings.passingScorePercent ?? 100,
      questions: {
        create: quiz.questions.map((q, index) => ({
          sortOrder: index,
          questionText: q.questionText,
          correctKey: q.correctKey,
          options: {
            create: q.options.map((opt, optIndex) => ({
              optionKey: opt.key,
              optionText: opt.text,
              sortOrder: optIndex,
            })),
          },
        })),
      },
    },
    include: quizInclude,
  });

  return row;
}

export function mapPublicQuiz(quiz: {
  id: string;
  bountyId: string;
  showCorrectOnFailure: boolean;
  unlimitedAttempts: boolean;
  requireWallet: boolean;
  oneRewardPerWallet: boolean;
  passingScorePercent: number;
  questions: {
    id: string;
    sortOrder: number;
    questionText: string;
    options: { optionKey: string; optionText: string; sortOrder: number }[];
  }[];
}): PublicQuiz {
  return {
    id: quiz.id,
    bountyId: quiz.bountyId,
    settings: {
      showCorrectOnFailure: quiz.showCorrectOnFailure,
      unlimitedAttempts: quiz.unlimitedAttempts,
      requireWallet: quiz.requireWallet,
      oneRewardPerWallet: quiz.oneRewardPerWallet,
      passingScorePercent: quiz.passingScorePercent,
    },
    questions: quiz.questions.map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      questionText: q.questionText,
      options: q.options.map((o) => ({
        key: o.optionKey,
        text: o.optionText,
      })),
    })),
  };
}

export async function getQuizByBountyId(db: Db, bountyId: string) {
  return db.bountyQuiz.findUnique({
    where: { bountyId },
    include: quizInclude,
  });
}

export function gradeQuizAttempt(
  quiz: {
    showCorrectOnFailure: boolean;
    passingScorePercent: number;
    questions: {
      id: string;
      correctKey: string;
      options: { optionKey: string; optionText: string }[];
    }[];
  },
  answers: Record<string, string>
): { results: QuizAnswerResult[]; score: number; passed: boolean } {
  const results: QuizAnswerResult[] = [];
  let score = 0;

  for (const question of quiz.questions) {
    const selected = (answers[question.id] ?? "").trim().toUpperCase();
    const correct = question.correctKey.trim().toUpperCase();
    const isCorrect = selected.length > 0 && selected === correct;
    if (isCorrect) score += 1;

    const correctOption = question.options.find((o) => o.optionKey === correct);
    const result: QuizAnswerResult = {
      questionId: question.id,
      selectedKey: selected,
      correct: isCorrect,
    };

    if (!isCorrect && quiz.showCorrectOnFailure) {
      result.correctKey = correct;
      result.correctText = correctOption?.optionText;
    }

    results.push(result);
  }

  const total = quiz.questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percent >= quiz.passingScorePercent;

  return { results, score, passed };
}

export function buildSubmitResult(input: {
  passed: boolean;
  score: number;
  totalQuestions: number;
  results: QuizAnswerResult[];
  unlimitedAttempts: boolean;
  participationStatus: string;
}): QuizSubmitResult {
  return {
    passed: input.passed,
    score: input.score,
    totalQuestions: input.totalQuestions,
    results: input.results,
    canRetry: !input.passed && input.unlimitedAttempts,
    participationStatus: input.participationStatus,
  };
}
