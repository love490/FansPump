export const DEVELOPMENT_STAGES = [
  "IDEA",
  "BUILDING",
  "TESTNET",
  "MAINNET",
  "LIVE",
  "DEPRECATED",
] as const;

export type DevelopmentStageId = (typeof DEVELOPMENT_STAGES)[number];

export const DEVELOPMENT_STAGE_LABELS: Record<DevelopmentStageId, string> = {
  IDEA: "Idea",
  BUILDING: "Building",
  TESTNET: "Testnet",
  MAINNET: "Mainnet",
  LIVE: "Live",
  DEPRECATED: "Deprecated",
};

export const ROADMAP_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED"] as const;

export type RoadmapStatusId = (typeof ROADMAP_STATUSES)[number];

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatusId, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export type RoadmapMilestone = {
  id: string;
  title: string;
  description?: string | null;
  status: RoadmapStatusId;
};

export function isDevelopmentStage(value: string): value is DevelopmentStageId {
  return (DEVELOPMENT_STAGES as readonly string[]).includes(value);
}

export function isRoadmapStatus(value: string): value is RoadmapStatusId {
  return (ROADMAP_STATUSES as readonly string[]).includes(value);
}

export function parseRoadmap(value: unknown): RoadmapMilestone[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is RoadmapMilestone =>
      item &&
      typeof item === "object" &&
      typeof (item as RoadmapMilestone).id === "string" &&
      typeof (item as RoadmapMilestone).title === "string" &&
      isRoadmapStatus((item as RoadmapMilestone).status)
  );
}

/** Off-chain profile fields creators may update after launch. */
export const EDITABLE_PROJECT_PROFILE_FIELDS = [
  "logoUrl",
  "bannerUrl",
  "displayName",
  "tagline",
  "summary",
  "description",
  "category",
  "themeColor",
  "website",
  "twitter",
  "telegram",
  "discord",
  "github",
  "medium",
  "documentation",
  "whitepaper",
  "supportEmail",
  "announcementChannel",
  "communityInviteLink",
  "officialContact",
  "developmentStage",
  "roadmap",
] as const;

export type EditableProjectProfileField = (typeof EDITABLE_PROJECT_PROFILE_FIELDS)[number];
