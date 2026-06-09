export const ANNOUNCEMENT_TYPES = [
  "VERSION_RELEASE",
  "PARTNERSHIP",
  "LIQUIDITY_ADDED",
  "EXCHANGE_LISTING",
  "MARKETING_UPDATE",
  "COMMUNITY_UPDATE",
  "GENERAL",
] as const;

export type AnnouncementTypeId = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementTypeId, string> = {
  VERSION_RELEASE: "Version Release",
  PARTNERSHIP: "Partnership",
  LIQUIDITY_ADDED: "Liquidity Added",
  EXCHANGE_LISTING: "Exchange Listing",
  MARKETING_UPDATE: "Marketing Update",
  COMMUNITY_UPDATE: "Community Update",
  GENERAL: "General Announcement",
};

export function isAnnouncementType(value: string): value is AnnouncementTypeId {
  return (ANNOUNCEMENT_TYPES as readonly string[]).includes(value);
}
