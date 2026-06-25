"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SOCIAL_ACTION_META,
  SOCIAL_BOUNTY_ACTIONS,
  type BountyTaskStep,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";

type BountyTaskStepEditorProps = {
  socialActions: SocialBountyActionId[];
  taskSteps: BountyTaskStep[];
  showCustomTasks: boolean;
  onTaskStepsChange: (steps: BountyTaskStep[]) => void;
};

function updateStep(steps: BountyTaskStep[], id: string, patch: Partial<BountyTaskStep>) {
  return steps.map((step) => (step.id === id ? { ...step, ...patch } : step));
}

export function BountyTaskStepEditor({
  socialActions,
  taskSteps,
  showCustomTasks,
  onTaskStepsChange,
}: BountyTaskStepEditorProps) {
  const socialSteps = taskSteps.filter((s) => s.kind === "social");
  const extraSteps = taskSteps.filter((s) => s.kind !== "social");

  function addCustomStep(kind: "custom" | "question") {
    onTaskStepsChange([
      ...taskSteps,
      {
        id: `step-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        instruction: "",
        linkUrl: "",
        buttonLabel: kind === "question" ? "Next" : "Open link",
      },
    ]);
  }

  function removeStep(id: string) {
    onTaskStepsChange(taskSteps.filter((step) => step.id !== id));
  }

  return (
    <div className="space-y-4">
      {socialSteps.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label>Social task details</Label>
            <p className="text-xs text-muted-foreground">
              Add the task wording, link, and XP points you want to award. Participants only earn the XP you set.
            </p>
          </div>
          {socialSteps.map((step) => {
            const action = SOCIAL_BOUNTY_ACTIONS.find((a) => a.id === step.actionId);
            const meta = step.actionId ? SOCIAL_ACTION_META[step.actionId] : null;
            return (
              <div key={step.id} className="space-y-3 rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-medium">{action?.label ?? "Social task"}</p>
                <div className="space-y-2">
                  <Label htmlFor={`${step.id}-instruction`}>Task instruction</Label>
                  <Input
                    id={`${step.id}-instruction`}
                    value={step.instruction}
                    onChange={(e) =>
                      onTaskStepsChange(updateStep(taskSteps, step.id, { instruction: e.target.value }))
                    }
                    placeholder={meta?.instructionPlaceholder ?? "Describe what to do"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${step.id}-link`}>Link URL</Label>
                  <Input
                    id={`${step.id}-link`}
                    value={step.linkUrl ?? ""}
                    onChange={(e) =>
                      onTaskStepsChange(updateStep(taskSteps, step.id, { linkUrl: e.target.value }))
                    }
                    placeholder={meta?.linkPlaceholder ?? "https://"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${step.id}-xp`}>XP points</Label>
                  <Input
                    id={`${step.id}-xp`}
                    type="number"
                    min={0}
                    max={10000}
                    value={step.xpPoints ?? ""}
                    onChange={(e) =>
                      onTaskStepsChange(
                        updateStep(taskSteps, step.id, {
                          xpPoints: Math.max(1, Number(e.target.value) || 0),
                        })
                      )
                    }
                    placeholder="e.g. 15"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${step.id}-button`}>Button label</Label>
                  <Input
                    id={`${step.id}-button`}
                    value={step.buttonLabel ?? ""}
                    onChange={(e) =>
                      onTaskStepsChange(updateStep(taskSteps, step.id, { buttonLabel: e.target.value }))
                    }
                    placeholder={meta?.defaultButton ?? "Open"}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCustomTasks && (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <div>
            <Label>Custom / quiz tasks</Label>
            <p className="text-xs text-muted-foreground">
              Add extra steps such as custom actions or quiz prompts. Participants move through them one
              by one (1/5, 2/5, …).
            </p>
          </div>

          {(() => {
            let quizCount = 0;
            let customCount = 0;
            return extraSteps.map((step) => {
              const stepLabel =
                step.kind === "question"
                  ? `Quiz ${++quizCount}`
                  : `Custom task ${++customCount}`;
              return (
            <div key={step.id} className="space-y-3 rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{stepLabel}</p>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeStep(step.id)}>
                  Remove
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${step.id}-instruction`}>Task / quiz prompt</Label>
                <Input
                  id={`${step.id}-instruction`}
                  value={step.instruction}
                  onChange={(e) =>
                    onTaskStepsChange(updateStep(taskSteps, step.id, { instruction: e.target.value }))
                  }
                  placeholder={
                    step.kind === "question"
                      ? "What is your favorite feature?"
                      : "Share this post with your friends"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${step.id}-link`}>Link URL (optional)</Label>
                <Input
                  id={`${step.id}-link`}
                  value={step.linkUrl ?? ""}
                  onChange={(e) =>
                    onTaskStepsChange(updateStep(taskSteps, step.id, { linkUrl: e.target.value }))
                  }
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${step.id}-xp`}>XP points</Label>
                <Input
                  id={`${step.id}-xp`}
                  type="number"
                  min={0}
                  max={10000}
                  value={step.xpPoints ?? ""}
                  onChange={(e) =>
                    onTaskStepsChange(
                      updateStep(taskSteps, step.id, {
                        xpPoints: Math.max(1, Number(e.target.value) || 0),
                      })
                    )
                  }
                  placeholder="e.g. 20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${step.id}-button`}>Button label</Label>
                <Input
                  id={`${step.id}-button`}
                  value={step.buttonLabel ?? ""}
                  onChange={(e) =>
                    onTaskStepsChange(updateStep(taskSteps, step.id, { buttonLabel: e.target.value }))
                  }
                  placeholder={step.kind === "question" ? "Next" : "Open link"}
                />
              </div>
            </div>
              );
            });
          })()}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addCustomStep("custom")}>
              Add custom task
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addCustomStep("question")}>
              Add quiz
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
