"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEVELOPMENT_STAGE_LABELS,
  ROADMAP_STATUS_LABELS,
  type DevelopmentStageId,
  type RoadmapMilestone,
} from "@iopn/shared";
import { Map } from "lucide-react";

type ProjectRoadmapSectionProps = {
  milestones: RoadmapMilestone[];
  developmentStage?: DevelopmentStageId | null;
};

export function ProjectRoadmapSection({ milestones, developmentStage }: ProjectRoadmapSectionProps) {
  if (!developmentStage && milestones.length === 0) return null;

  return (
    <Card className="mt-8 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 shrink-0" /> Roadmap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {developmentStage && (
          <p className="text-sm text-muted-foreground">
            Stage:{" "}
            <span className="font-medium text-foreground">
              {DEVELOPMENT_STAGE_LABELS[developmentStage]}
            </span>
          </p>
        )}
        {milestones.length > 0 && (
          <ol className="space-y-3">
            {milestones.map((item) => (
              <li key={item.id} className="rounded-lg border border-border p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <Badge variant="secondary">{ROADMAP_STATUS_LABELS[item.status]}</Badge>
                </div>
                {item.description && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
