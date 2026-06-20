"use client";

import { Label } from "@/components/ui/label";
import { BOUNTY_TASK_TYPES, type BountyTaskType } from "@/lib/bounties";
import { SOCIAL_BOUNTY_ACTIONS, type SocialBountyActionId } from "@/lib/bounty-task-config";
import { cn } from "@/lib/utils";

type BountyTaskPickerProps = {
  taskTypes: BountyTaskType[];
  socialActions: SocialBountyActionId[];
  onTaskTypesChange: (value: BountyTaskType[]) => void;
  onSocialActionsChange: (value: SocialBountyActionId[]) => void;
  className?: string;
};

function toggleItem<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function BountyTaskPicker({
  taskTypes,
  socialActions,
  onTaskTypesChange,
  onSocialActionsChange,
  className,
}: BountyTaskPickerProps) {
  const showSocialActions = taskTypes.includes("SOCIAL");

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
                    onSocialActionsChange([]);
                  }
                }}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {showSocialActions && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Label>Social actions</Label>
          <p className="text-xs text-muted-foreground">
            Choose what participants must do. These are shown on Earn instead of a generic &quot;Social&quot; label.
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
                    onSocialActionsChange(toggleItem(socialActions, action.id))
                  }
                />
                <span>{action.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
