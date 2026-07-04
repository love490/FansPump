"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { apiUrl } from "@/lib/api";
import { formatContractError } from "@/lib/contract-errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublicQuiz, QuizSubmitResult } from "@/lib/quiz";
import { Check, X } from "lucide-react";

type QuizRunnerProps = {
  bountyId: string;
  walletAddress: string;
  onClaimReady?: () => void;
  onProgressChange?: (current: number, total: number) => void;
};

type Phase = "loading" | "quiz" | "results" | "error";

export function QuizRunner({
  bountyId,
  walletAddress,
  onClaimReady,
  onProgressChange,
}: QuizRunnerProps) {
  const { isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submitResult, setSubmitResult] = useState<QuizSubmitResult | null>(null);

  const loadQuiz = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/bounties/${bountyId}/quiz`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load quiz");
      setQuiz(data.quiz);
      setPhase("quiz");
      setCurrentIndex(0);
      setAnswers({});
      setSubmitResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quiz");
      setPhase("error");
    }
  }, [bountyId]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  const currentQuestion = quiz?.questions[currentIndex];
  const totalQuestions = quiz?.questions.length ?? 0;

  useEffect(() => {
    if (phase === "quiz" && totalQuestions > 0) {
      onProgressChange?.(currentIndex + 1, totalQuestions);
    }
  }, [phase, currentIndex, totalQuestions, onProgressChange]);

  const allAnswered = useMemo(() => {
    if (!quiz) return false;
    return quiz.questions.every((q) => answers[q.id]?.trim());
  }, [quiz, answers]);

  const isLastQuestion = totalQuestions > 0 && currentIndex >= totalQuestions - 1;

  async function signAction(action: string) {
    if (!walletAddress) {
      throw new Error("Connect your wallet to submit the quiz");
    }
    if (!isConnected) {
      throw new Error("Connect your wallet to submit the quiz");
    }
    const prefix = process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
    const message = `${prefix}\n${action}\nWallet: ${walletAddress.toLowerCase()}\nTime: ${Date.now()}`;
    const signature = await signMessageAsync({ message });
    return { walletAddress, message, signature };
  }

  async function handleSubmit() {
    if (!quiz || !allAnswered) return;
    setBusy(true);
    setError(null);
    try {
      const auth = await signAction(`Submit quiz: ${bountyId}`);
      const res = await fetch(apiUrl(`/api/bounties/${bountyId}/quiz/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auth, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quiz submission failed");
      setSubmitResult(data.result);
      setPhase("results");
      if (data.result?.passed) {
        onClaimReady?.();
      }
    } catch (e) {
      setError(formatContractError(e instanceof Error ? e.message : "Quiz submission failed"));
    } finally {
      setBusy(false);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitResult(null);
    setPhase("quiz");
    setError(null);
  }

  function handleNext() {
    if (!currentQuestion || !answers[currentQuestion.id]) return;
    setCurrentIndex((i) => Math.min(i + 1, totalQuestions - 1));
  }

  if (phase === "loading") {
    return <p className="text-sm text-muted-foreground">Loading quiz…</p>;
  }

  if (phase === "error" || !quiz) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error ?? "Quiz unavailable"}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadQuiz()}>
          Retry
        </Button>
      </div>
    );
  }

  if (phase === "results" && submitResult) {
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    return (
      <div className="space-y-4">
        <div
          className={cn(
            "rounded-lg border p-4",
            submitResult.passed
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-red-500/40 bg-red-500/10"
          )}
        >
          <p className="font-semibold">
            {submitResult.passed ? "Quiz completed ✓" : "Quiz failed"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Score: {submitResult.score}/{submitResult.totalQuestions}
          </p>
        </div>

        <div className="space-y-3">
          {submitResult.results.map((result, index) => {
            const question = questionMap.get(result.questionId);
            return (
              <div key={result.questionId} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start gap-2">
                  {result.correct ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">
                      {index + 1}/{submitResult.totalQuestions}. {question?.questionText}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Your answer: {result.selectedKey}
                      {question?.options.find((o) => o.key === result.selectedKey)?.text &&
                        ` — ${question.options.find((o) => o.key === result.selectedKey)?.text}`}
                    </p>
                    {!result.correct && result.correctKey && result.correctText && (
                      <p className="mt-1 text-emerald-700">
                        Correct: {result.correctKey}) {result.correctText}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {submitResult.passed ? (
          <p className="text-sm font-medium text-emerald-600">Quiz step complete — claim your XP below.</p>
        ) : submitResult.canRetry ? (
          <Button type="button" onClick={handleRestart}>
            Try again
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No more attempts allowed for this quiz.</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!currentQuestion || totalQuestions === 0) return null;

  const selected = answers[currentQuestion.id] ?? "";

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary" className="tabular-nums font-semibold">
          {currentIndex + 1}/{totalQuestions}
        </Badge>
        <p className="text-xs text-muted-foreground">Choose an option, then tap Next</p>
      </div>

      <p className="text-base font-semibold leading-snug">{currentQuestion.questionText}</p>

      <div className="space-y-2" role="radiogroup" aria-label={`Question ${currentIndex + 1}`}>
        {currentQuestion.options.map((opt) => (
          <label
            key={opt.key}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 transition-colors",
              selected === opt.key ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/40"
            )}
          >
            <input
              type="radio"
              name={`quiz-${currentQuestion.id}`}
              value={opt.key}
              checked={selected === opt.key}
              onChange={() =>
                setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.key }))
              }
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-semibold">{opt.key}.</span> {opt.text}
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {currentIndex > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            Back
          </Button>
        )}
        {!isLastQuestion ? (
          <Button type="button" size="sm" disabled={!selected} onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!selected || busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? "Checking…" : "Submit"}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
