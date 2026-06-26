import { Badge } from "@/components/ui/badge";
import { getBountyTaskDisplayLabels } from "@/lib/bounty-task-config";
import type { BountyListItem } from "@/lib/bounties";

export function BountyTaskBadges({
  bounty,
}: {
  bounty: Pick<BountyListItem, "taskType" | "verificationMethod" | "verificationConfig">;
}) {
  const labels = getBountyTaskDisplayLabels(bounty);

  return (
    <>
      {labels.map((label) => (
        <Badge key={label} variant="outline">
          {label}
        </Badge>
      ))}
    </>
  );
}
