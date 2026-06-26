export const QUIZ_OPTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const;
export type QuizOptionKey = (typeof QUIZ_OPTION_KEYS)[number];

export type QuizOptionDraft = {
  key: QuizOptionKey;
  text: string;
};

export type QuizQuestionDraft = {
  id: string;
  questionText: string;
  options: QuizOptionDraft[];
  correctKey: QuizOptionKey;
};

export type QuizSettingsDraft = {
  showCorrectOnFailure: boolean;
  unlimitedAttempts: boolean;
  requireWallet: boolean;
  oneRewardPerWallet: boolean;
  passingScorePercent: number;
};

export type QuizDraft = {
  settings: QuizSettingsDraft;
  questions: QuizQuestionDraft[];
};

export type PublicQuizOption = {
  key: string;
  text: string;
};

export type PublicQuizQuestion = {
  id: string;
  sortOrder: number;
  questionText: string;
  options: PublicQuizOption[];
};

export type PublicQuiz = {
  id: string;
  bountyId: string;
  settings: QuizSettingsDraft;
  questions: PublicQuizQuestion[];
};

export type QuizAnswerResult = {
  questionId: string;
  selectedKey: string;
  correct: boolean;
  correctKey?: string;
  correctText?: string;
};

export type QuizSubmitResult = {
  passed: boolean;
  score: number;
  totalQuestions: number;
  results: QuizAnswerResult[];
  canRetry: boolean;
  participationStatus: string;
};

export function createEmptyQuestion(): QuizQuestionDraft {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    questionText: "",
    options: [
      { key: "A", text: "" },
      { key: "B", text: "" },
    ],
    correctKey: "A",
  };
}

export function defaultQuizDraft(): QuizDraft {
  return {
    settings: {
      showCorrectOnFailure: false,
      unlimitedAttempts: true,
      requireWallet: true,
      oneRewardPerWallet: true,
      passingScorePercent: 100,
    },
    questions: [createEmptyQuestion()],
  };
}

export function quizDraftHasContent(draft: QuizDraft): boolean {
  return draft.questions.some((q) => q.questionText.trim().length > 0);
}

export function quizDraftToPayload(draft: QuizDraft) {
  return {
    settings: draft.settings,
    questions: draft.questions.map((q) => ({
      questionText: q.questionText,
      correctKey: q.correctKey,
      options: q.options.map((o) => ({ key: o.key, text: o.text })),
    })),
  };
}

export function validateQuizDraft(draft: QuizDraft): string | null {
  if (!draft.questions.length) return "Add at least one question";
  for (let i = 0; i < draft.questions.length; i++) {
    const q = draft.questions[i];
    if (!q.questionText.trim()) return `Question ${i + 1} needs text`;
    if (q.options.length < 2) return `Question ${i + 1} needs at least 2 options`;
    for (const opt of q.options) {
      if (!opt.text.trim()) return `Question ${i + 1} option ${opt.key} needs text`;
    }
    if (!q.options.some((o) => o.key === q.correctKey)) {
      return `Question ${i + 1} must have a correct answer selected`;
    }
  }
  return null;
}
