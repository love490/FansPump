import type { DevelopmentStageId, RoadmapMilestone, TokenCategoryId } from "@iopn/shared";

export type ProjectProfileFormState = {
  logoUrl: string;
  bannerUrl: string;
  displayName: string;
  tagline: string;
  summary: string;
  description: string;
  category: TokenCategoryId;
  themeColor: string;
  website: string;
  github: string;
  telegram: string;
  twitter: string;
  discord: string;
  medium: string;
  documentation: string;
  whitepaper: string;
  supportEmail: string;
  announcementChannel: string;
  communityInviteLink: string;
  officialContact: string;
  developmentStage: DevelopmentStageId | "";
  roadmap: RoadmapMilestone[];
};

export function emptyProjectProfileForm(category: TokenCategoryId = "OTHER"): ProjectProfileFormState {
  return {
    logoUrl: "",
    bannerUrl: "",
    displayName: "",
    tagline: "",
    summary: "",
    description: "",
    category,
    themeColor: "",
    website: "",
    github: "",
    telegram: "",
    twitter: "",
    discord: "",
    medium: "",
    documentation: "",
    whitepaper: "",
    supportEmail: "",
    announcementChannel: "",
    communityInviteLink: "",
    officialContact: "",
    developmentStage: "",
    roadmap: [],
  };
}

export function profileFormFromToken(token: Record<string, unknown>): ProjectProfileFormState {
  const roadmap = Array.isArray(token.roadmap) ? (token.roadmap as RoadmapMilestone[]) : [];
  return {
    logoUrl: (token.logoUrl as string) ?? "",
    bannerUrl: (token.bannerUrl as string) ?? "",
    displayName: (token.displayName as string) ?? "",
    tagline: (token.tagline as string) ?? "",
    summary: (token.summary as string) ?? "",
    description: (token.description as string) ?? "",
    category: ((token.category as TokenCategoryId) ?? "OTHER") as TokenCategoryId,
    themeColor: (token.themeColor as string) ?? "",
    website: (token.website as string) ?? "",
    github: (token.github as string) ?? "",
    telegram: (token.telegram as string) ?? "",
    twitter: (token.twitter as string) ?? "",
    discord: (token.discord as string) ?? "",
    medium: (token.medium as string) ?? "",
    documentation: (token.documentation as string) ?? "",
    whitepaper: (token.whitepaper as string) ?? "",
    supportEmail: (token.supportEmail as string) ?? "",
    announcementChannel: (token.announcementChannel as string) ?? "",
    communityInviteLink: (token.communityInviteLink as string) ?? "",
    officialContact: (token.officialContact as string) ?? "",
    developmentStage: (token.developmentStage as DevelopmentStageId) ?? "",
    roadmap,
  };
}

export function projectEditHref(tokenAddress: string): string {
  return `/project/${tokenAddress}/edit`;
}
