"use client";

import { Label } from "@/components/ui/label";
import { BOUNTY_TASK_TYPES, type BountyTaskType } from "@/lib/bounties";
import {
  SOCIAL_BOUNTY_ACTIONS,
  syncSocialTaskSteps,
  type BountyTaskStep,
  type SocialBountyActionId,
} from "@/lib/bounty-task-config";
import { BountyTaskStepEditor } from "@/components/bounties/bounty-task-step-editor";
import { cn } from "@/lib/utils";

type BountyTaskPickerProps = {
  taskTypes: BountyTaskType[];
  socialActions: SocialBountyActionId[];
  taskSteps: BountyTaskStep[];
  onTaskTypesChange: (value: BountyTaskType[]) => void;
  onSocialActionsChange: (value: SocialBountyActionId[]) => void;
  onTaskStepsChange: (value: BountyTaskStep[]) => void;
  className?: string;
};

function toggleItem<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function BountyTaskPicker({
  taskTypes,
  socialActions,
  taskSteps,
  onTaskTypesChange,
  onSocialActionsChange,
  onTaskStepsChange,
  className,
}: BountyTaskPickerProps) {
  const showSocialActions = taskTypes.includes("SOCIAL");
  const showCustomTasks = taskTypes.includes("CUSTOM");

  function handleSocialActionsChange(next: SocialBountyActionId[]) {
    onSocialActionsChange(next);
    onTaskStepsChange(syncSocialTaskSteps(next, taskSteps));
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label>Task types</Label>
        <p className="text-xs text-muted-foreground">Select one or more categories for this bounty.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {BOUNTY_TASK_TYPES.map((type) => (
            <label
              key={type.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm hover:bg-muted/40"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={taskTypes.includes(type.id)}
                onChange={() => {
                  const next = toggleItem(taskTypes, type.id);
                  onTaskTypesChange(next);
                  if (!next.includes("SOCIAL")) {
                    handleSocialActionsChange([]);
                  }
                }}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {showSocialActions && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="space-y-2">
            <Label>Social actions</Label>
            <p className="text-xs text-muted-foreground">
              Choose what participants must do, then add the task text and link below.
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
                    onChange={() =>
                      handleSocialActionsChange(toggleItem(socialActions, action.id))
                    }
                  />
                  <span>{action.label}</span>
                </label>
              ))}
            </div>
          </div>

          <BountyTaskStepEditor
            socialActions={socialActions}
            taskSteps={taskSteps}
            showCustomTasks={false}
            onTaskStepsChange={onTaskStepsChange}
          />
        </div>
      )}

      {showCustomTasks && (
        <BountyTaskStepEditor
          socialActions={[]}
          taskSteps={taskSteps}
          showCustomTasks
          onTaskStepsChange={onTaskStepsChange}
        />
      )}
    </div>
  );
}
