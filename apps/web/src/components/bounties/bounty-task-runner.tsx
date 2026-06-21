"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getBountyTaskSteps,
  stepButtonLabel,
  type BountyTaskStep,
} from "@/lib/bounty-task-config";
import type { BountyListItem } from "@/lib/bounties";

type BountyTaskRunnerProps = {
  bounty: Pick<BountyListItem, "taskType" | "verificationConfig">;
};

export function BountyTaskRunner({ bounty }: BountyTaskRunnerProps) {
  const steps = getBountyTaskSteps(bounty);
  const [index, setIndex] = useState(0);

  if (steps.length === 0) return null;

  const step = steps[index];
  const total = steps.length;
  const quizSteps = steps.filter((s) => s.kind === "question");
  const quizProgress = getQuizProgress(step, quizSteps);

  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium">
          {step.kind === "question" ? "Quiz" : "Tasks to complete"}
        </p>
        {quizProgress && (
          <span className="text-xs text-muted-foreground">
            {quizProgress.current}/{quizProgress.total}
          </span>
        )}
      </div>

      <TaskStepCard step={step} />

      {total > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index >= total - 1}
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {total > 1 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3">
          {steps.map((item, stepIndex) => {
            const itemQuizProgress = getQuizProgress(item, quizSteps);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60"
                  onClick={() => setIndex(stepIndex)}
                >
                  {itemQuizProgress && (
                    <span className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      {itemQuizProgress.current}/{itemQuizProgress.total}
                    </span>
                  )}
                  <span
                    className={
                      stepIndex === index ? "font-medium text-foreground" : "text-muted-foreground"
                    }
                  >
                    {item.instruction.trim() || stepButtonLabel(item)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function getQuizProgress(
  step: BountyTaskStep,
  quizSteps: BountyTaskStep[]
): { current: number; total: number } | null {
  if (step.kind !== "question" || quizSteps.length === 0) return null;
  const quizIndex = quizSteps.findIndex((s) => s.id === step.id);
  if (quizIndex < 0) return null;
  return { current: quizIndex + 1, total: quizSteps.length };
}

function TaskStepCard({ step }: { step: BountyTaskStep }) {
  const label = stepButtonLabel(step);
  const link = step.linkUrl?.trim();

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <p className="text-base font-medium text-foreground">{step.instruction.trim() || label}</p>
      {link ? (
        <Button asChild size="sm">
          <a href={link} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Complete this step, then continue.</p>
      )}
    </div>
  );
}
