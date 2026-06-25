export const QUIZ_OPTION_KEYS = ["A", "B", "C", "D", "E", "F"] as const;
export type QuizOptionKey = (typeof QUIZ_OPTION_KEYS)[number];

export type QuizOptionInput = {
  key: string;
  text: string;
};

export type QuizQuestionInput = {
  questionText: string;
  options: QuizOptionInput[];
  correctKey: string;
};

export type QuizSettingsInput = {
  showCorrectOnFailure?: boolean;
  unlimitedAttempts?: boolean;
  requireWallet?: boolean;
  oneRewardPerWallet?: boolean;
  passingScorePercent?: number;
};

export type QuizInput = {
  settings: QuizSettingsInput;
  questions: QuizQuestionInput[];
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
  settings: {
    showCorrectOnFailure: boolean;
    unlimitedAttempts: boolean;
    requireWallet: boolean;
    oneRewardPerWallet: boolean;
    passingScorePercent: number;
  };
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
