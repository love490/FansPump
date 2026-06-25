import { QUIZ_OPTION_KEYS, type QuizInput } from "./types";

export function validateQuizInput(quiz: QuizInput): string | null {
  if (!quiz.questions?.length) {
    return "Add at least one quiz question";
  }

  if (quiz.questions.length > 50) {
    return "Maximum 50 questions per quiz";
  }

  const passing = quiz.settings?.passingScorePercent ?? 100;
  if (!Number.isInteger(passing) || passing < 1 || passing > 100) {
    return "Passing score must be between 1 and 100";
  }

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const label = `Question ${i + 1}`;

    if (!q.questionText?.trim()) {
      return `${label} needs question text`;
    }

    if (!q.options?.length || q.options.length < 2) {
      return `${label} needs at least 2 answer options`;
    }

    if (q.options.length > 6) {
      return `${label} supports at most 6 options (A–F)`;
    }

    const keys = new Set<string>();
    for (const opt of q.options) {
      const key = opt.key?.trim().toUpperCase();
      if (!key || !QUIZ_OPTION_KEYS.includes(key as (typeof QUIZ_OPTION_KEYS)[number])) {
        return `${label} has an invalid option key (use A–F)`;
      }
      if (!opt.text?.trim()) {
        return `${label} option ${key} needs text`;
      }
      if (keys.has(key)) {
        return `${label} has duplicate option key ${key}`;
      }
      keys.add(key);
    }

    const correct = q.correctKey?.trim().toUpperCase();
    if (!correct || !keys.has(correct)) {
      return `${label} must select a correct answer from its options`;
    }
  }

  return null;
}

export function normalizeQuizInput(quiz: QuizInput): QuizInput {
  return {
    settings: {
      showCorrectOnFailure: quiz.settings?.showCorrectOnFailure ?? false,
      unlimitedAttempts: quiz.settings?.unlimitedAttempts ?? true,
      requireWallet: quiz.settings?.requireWallet ?? true,
      oneRewardPerWallet: quiz.settings?.oneRewardPerWallet ?? true,
      passingScorePercent: quiz.settings?.passingScorePercent ?? 100,
    },
    questions: quiz.questions.map((q, index) => ({
      questionText: q.questionText.trim(),
      correctKey: q.correctKey.trim().toUpperCase(),
      options: q.options.map((opt) => ({
        key: opt.key.trim().toUpperCase(),
        text: opt.text.trim(),
      })),
    })),
  };
}
