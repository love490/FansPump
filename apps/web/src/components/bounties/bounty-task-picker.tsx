"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  SOCIAL_BOUNTY_ACTIONS,
  syncSocialTaskSteps,
  type BountyTaskStep,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";
import { BountyTaskStepEditor } from "@/components/bounties/bounty-task-step-editor";
import { QuizBuilder } from "@/components/quiz/quiz-builder";
import { quizDraftHasContent, type QuizDraft } from "@/lib/quiz";
import { cn } from "@/lib/utils";

type BountyTaskPickerProps = {
  socialActions: SocialBountyActionId[];
  taskSteps: BountyTaskStep[];
  quiz: QuizDraft;
  quizXpPoints: string;
  onSocialActionsChange: (value: SocialBountyActionId[]) => void;
  onTaskStepsChange: (value: BountyTaskStep[]) => void;
  onQuizChange: (value: QuizDraft) => void;
  onQuizXpPointsChange: (value: string) => void;
  showQuiz?: boolean;
  className?: string;
};

function toggleItem<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function BountyTaskPicker({
  socialActions,
  taskSteps,
  quiz,
  quizXpPoints,
  onSocialActionsChange,
  onTaskStepsChange,
  onQuizChange,
  onQuizXpPointsChange,
  showQuiz = true,
  className,
}: BountyTaskPickerProps) {
  function handleSocialActionsChange(next: SocialBountyActionId[]) {
    onSocialActionsChange(next);
    onTaskStepsChange(syncSocialTaskSteps(next, taskSteps));
  }

  const quizEnabled = showQuiz && quizDraftHasContent(quiz);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="space-y-2">
          <Label>Social tasks (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Choose social actions participants must complete, then set instructions, links, and XP below.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SOCIAL_BOUNTY_ACTIONS.map((action) => (
              <label
                key={action.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm hover:bg-muted/30"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={socialActions.includes(action.id)}
                  onChange={() => handleSocialActionsChange(toggleItem(socialActions, action.id))}
                />
                <span>{action.label}</span>
              </label>
            ))}
          </div>
        </div>

        {socialActions.length > 0 && (
          <BountyTaskStepEditor
            socialActions={socialActions}
            taskSteps={taskSteps}
            showCustomTasks={false}
            onTaskStepsChange={onTaskStepsChange}
          />
        )}
      </div>

      <BountyTaskStepEditor
        socialActions={[]}
        taskSteps={taskSteps}
        showCustomTasks
        onTaskStepsChange={onTaskStepsChange}
      />

      {showQuiz && (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <Label>Quiz (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Add multiple-choice questions. Participants pick an answer and tap Next until the quiz ends.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bounty-quiz-xp">Quiz XP points</Label>
            <Input
              id="bounty-quiz-xp"
              type="number"
              min={1}
              max={10000}
              value={quizXpPoints}
              onChange={(e) => onQuizXpPointsChange(e.target.value)}
              placeholder={quizEnabled ? "e.g. 25" : "Set when quiz has questions"}
              disabled={!quizEnabled}
            />
          </div>
          <QuizBuilder value={quiz} onChange={onQuizChange} />
        </div>
      )}
    </div>
  );
}
