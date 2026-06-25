"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  QUIZ_OPTION_KEYS,
  createEmptyQuestion,
  type QuizDraft,
  type QuizOptionKey,
  type QuizQuestionDraft,
} from "@/lib/quiz";

type QuizBuilderProps = {
  value: QuizDraft;
  onChange: (draft: QuizDraft) => void;
};

function nextOptionKey(options: QuizQuestionDraft["options"]): QuizOptionKey | null {
  for (const key of QUIZ_OPTION_KEYS) {
    if (!options.some((o) => o.key === key)) return key;
  }
  return null;
}

export function QuizBuilder({ value, onChange }: QuizBuilderProps) {
  function updateQuestion(index: number, patch: Partial<QuizQuestionDraft>) {
    const questions = value.questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange({ ...value, questions });
  }

  function updateSettings(patch: Partial<QuizDraft["settings"]>) {
    onChange({ ...value, settings: { ...value.settings, ...patch } });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-semibold">Quiz settings</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!value.settings.showCorrectOnFailure}
            onChange={(e) => updateSettings({ showCorrectOnFailure: !e.target.checked })}
          />
          Don&apos;t show correct answers after failure (only red ×)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.settings.unlimitedAttempts}
            onChange={(e) => updateSettings({ unlimitedAttempts: e.target.checked })}
          />
          Allow unlimited attempts
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.settings.requireWallet}
            onChange={(e) => updateSettings({ requireWallet: e.target.checked })}
          />
          Require wallet connection
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.settings.oneRewardPerWallet}
            onChange={(e) => updateSettings({ oneRewardPerWallet: e.target.checked })}
          />
          One reward per wallet
        </label>
        <div className="space-y-2">
          <Label>Passing score (%)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={value.settings.passingScorePercent}
            onChange={(e) =>
              updateSettings({ passingScorePercent: Number(e.target.value) || 100 })
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        {value.questions.map((question, qIndex) => (
          <div key={question.id} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Question {qIndex + 1}</p>
              {value.questions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({
                      ...value,
                      questions: value.questions.filter((_, i) => i !== qIndex),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Question text</Label>
              <Input
                value={question.questionText}
                onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                placeholder="What does IOPn stand for?"
              />
            </div>

            <div className="space-y-2">
              <Label>Answer options</Label>
              {question.options.map((opt, optIndex) => (
                <div key={opt.key} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-sm font-semibold">{opt.key}</span>
                  <Input
                    value={opt.text}
                    onChange={(e) => {
                      const options = question.options.map((o, i) =>
                        i === optIndex ? { ...o, text: e.target.value } : o
                      );
                      updateQuestion(qIndex, { options });
                    }}
                    placeholder={`Option ${opt.key}`}
                  />
                  {question.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const options = question.options.filter((_, i) => i !== optIndex);
                        const correctKey = options.some((o) => o.key === question.correctKey)
                          ? question.correctKey
                          : options[0]?.key ?? "A";
                        updateQuestion(qIndex, { options, correctKey });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {question.options.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const key = nextOptionKey(question.options);
                    if (!key) return;
                    updateQuestion(qIndex, {
                      options: [...question.options, { key, text: "" }],
                    });
                  }}
                >
                  Add option
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Correct answer</Label>
              <select
                value={question.correctKey}
                onChange={(e) =>
                  updateQuestion(qIndex, { correctKey: e.target.value as QuizOptionKey })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {question.options.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.key}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange({ ...value, questions: [...value.questions, createEmptyQuestion()] })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add question
        </Button>
      </div>
    </div>
  );
}
