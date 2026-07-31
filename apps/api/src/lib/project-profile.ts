import { type Prisma, Prisma as PrismaNamespace } from "@iopn/database";
import {
  DEVELOPMENT_STAGES,
  isTokenCategory,
  ROADMAP_STATUSES,
  type RoadmapMilestone,
} from "@iopn/shared";
import { z } from "zod";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

export const optionalImageUrl = z.preprocess(
  emptyToNull,
  z
    .union([
      z.string().url(),
      z.string().regex(/^\/uploads\/projects\/[a-zA-Z0-9._-]+$/),
      z.null(),
    ])
    .optional()
);

export const optionalHttpUrl = z.preprocess(
  emptyToNull,
  z.string().url().max(500).nullable().optional()
);

export const optionalSocialText = z.preprocess(
  emptyToNull,
  z.string().max(500).nullable().optional()
);

export const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email().max(254).nullable().optional()
);

export const optionalHexColor = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .nullable()
    .optional()
);

const roadmapMilestoneSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  description: z.preprocess(emptyToNull, z.string().max(2000).nullable().optional()),
  status: z.enum(ROADMAP_STATUSES),
});

export const roadmapSchema = z.array(roadmapMilestoneSchema).max(20).optional().nullable();

export const projectProfilePatchSchema = z
  .object({
    logoUrl: optionalImageUrl,
    bannerUrl: optionalImageUrl,
    displayName: z.preprocess(emptyToNull, z.string().min(1).max(80).nullable().optional()),
    tagline: z.preprocess(emptyToNull, z.string().max(160).nullable().optional()),
    summary: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
    description: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
    category: z
      .string()
      .optional()
      .nullable()
      .refine((v) => v == null || v === "" || isTokenCategory(v), "Invalid category"),
    themeColor: optionalHexColor,
    website: optionalHttpUrl,
    twitter: optionalSocialText,
    telegram: optionalSocialText,
    discord: optionalSocialText,
    github: optionalHttpUrl,
    medium: optionalHttpUrl,
    documentation: optionalHttpUrl,
    whitepaper: optionalHttpUrl,
    supportEmail: optionalEmail,
    announcementChannel: optionalSocialText,
    communityInviteLink: optionalHttpUrl,
    officialContact: optionalSocialText,
    developmentStage: z.enum(DEVELOPMENT_STAGES).optional().nullable(),
    roadmap: roadmapSchema,
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    message: z.string().min(10),
    signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  })
  .strict();

export const adminProjectProfilePatchSchema = projectProfilePatchSchema
  .omit({ walletAddress: true, message: true, signature: true })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "No fields to update");

export const announcementCreateSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(3).max(120),
  content: z.string().min(10).max(8000),
  type: z.enum([
    "VERSION_RELEASE",
    "PARTNERSHIP",
    "LIQUIDITY_ADDED",
    "EXCHANGE_LISTING",
    "MARKETING_UPDATE",
    "COMMUNITY_UPDATE",
    "GENERAL",
  ]),
  imageUrl: optionalImageUrl,
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(10),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

const IMMUTABLE_KEYS = new Set([
  "name",
  "symbol",
  "decimals",
  "initialSupply",
  "contractAddress",
  "creatorAddress",
  "chainId",
  "featureFlags",
  "buyTaxBps",
  "sellTaxBps",
  "maxWallet",
  "maxTx",
  "factoryAddress",
  "txHash",
]);

export function rejectImmutableFields(body: Record<string, unknown>) {
  for (const key of Object.keys(body)) {
    if (IMMUTABLE_KEYS.has(key)) {
      throw new Error(`Field "${key}" is immutable and cannot be updated`);
    }
  }
}

function serializeFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function normalizeCategory(value: string | null | undefined) {
  if (value == null || value === "") return undefined;
  return isTokenCategory(value) ? value : undefined;
}

export function buildProfileUpdateData(
  patch: z.infer<typeof projectProfilePatchSchema>
): Prisma.TokenProjectUpdateInput {
  const data: Prisma.TokenProjectUpdateInput = {
    profileUpdatedAt: new Date(),
  };

  if (patch.logoUrl !== undefined) data.logoUrl = patch.logoUrl;
  if (patch.bannerUrl !== undefined) data.bannerUrl = patch.bannerUrl;
  if (patch.displayName !== undefined) data.displayName = patch.displayName;
  if (patch.tagline !== undefined) data.tagline = patch.tagline;
  if (patch.summary !== undefined) data.summary = patch.summary;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.category !== undefined) {
    const category = normalizeCategory(patch.category ?? undefined);
    if (category) data.category = category;
    else if (patch.category === null || patch.category === "") data.category = "OTHER";
  }
  if (patch.themeColor !== undefined) data.themeColor = patch.themeColor;
  if (patch.website !== undefined) data.website = patch.website;
  if (patch.twitter !== undefined) data.twitter = patch.twitter;
  if (patch.telegram !== undefined) data.telegram = patch.telegram;
  if (patch.discord !== undefined) data.discord = patch.discord;
  if (patch.github !== undefined) data.github = patch.github;
  if (patch.medium !== undefined) data.medium = patch.medium;
  if (patch.documentation !== undefined) data.documentation = patch.documentation;
  if (patch.whitepaper !== undefined) data.whitepaper = patch.whitepaper;
  if (patch.supportEmail !== undefined) data.supportEmail = patch.supportEmail;
  if (patch.announcementChannel !== undefined) data.announcementChannel = patch.announcementChannel;
  if (patch.communityInviteLink !== undefined) data.communityInviteLink = patch.communityInviteLink;
  if (patch.officialContact !== undefined) data.officialContact = patch.officialContact;
  if (patch.developmentStage !== undefined) data.developmentStage = patch.developmentStage;
  if (patch.roadmap !== undefined) {
    data.roadmap =
      patch.roadmap === null
        ? PrismaNamespace.JsonNull
        : (patch.roadmap as unknown as Prisma.InputJsonValue);
  }

  return data;
}

export function validateNoDuplicateLinks(patch: Record<string, unknown>) {
  const urlFields = [
    "website",
    "github",
    "medium",
    "documentation",
    "whitepaper",
    "communityInviteLink",
  ] as const;
  const seen = new Map<string, string>();
  for (const field of urlFields) {
    const value = patch[field];
    if (typeof value !== "string" || !value.trim()) continue;
    const normalized = value.trim().toLowerCase();
    const existing = seen.get(normalized);
    if (existing) {
      throw new Error(`Duplicate link: ${field} matches ${existing}`);
    }
    seen.set(normalized, field);
  }
}

type TokenProfileRow = {
  id: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  displayName: string | null;
  tagline: string | null;
  summary: string | null;
  description: string | null;
  category: string;
  themeColor: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  github: string | null;
  medium: string | null;
  documentation: string | null;
  whitepaper: string | null;
  supportEmail: string | null;
  announcementChannel: string | null;
  communityInviteLink: string | null;
  officialContact: string | null;
  developmentStage: string | null;
  roadmap: unknown;
};

const PROFILE_FIELD_KEYS = [
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

export function collectProfileAuditEntries(
  before: TokenProfileRow,
  after: TokenProfileRow,
  patch: Record<string, unknown>
) {
  const entries: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  for (const field of PROFILE_FIELD_KEYS) {
    if (!(field in patch)) continue;
    const oldValue = serializeFieldValue(before[field as keyof TokenProfileRow]);
    const newValue = serializeFieldValue(after[field as keyof TokenProfileRow]);
    if (oldValue === newValue) continue;
    entries.push({ field, oldValue, newValue });
  }

  return entries;
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

function isRoadmapStatus(value: string): value is RoadmapMilestone["status"] {
  return (ROADMAP_STATUSES as readonly string[]).includes(value);
}
