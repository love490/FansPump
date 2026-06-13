export const DISCOVER_DEFAULT_SECTION = "all";

export const discoverBrowseSections = [
  {
    id: "all",
    label: "All Tokens",
    description: "All tokens created on FansPump — newest launches first.",
    variant: "grid" as const,
    group: "popular" as const,
  },
  {
    id: "new",
    label: "New",
    description: "Newly launched tokens — sorted by launch date.",
    variant: "grid" as const,
    group: "popular" as const,
  },
  {
    id: "trending",
    label: "Trending",
    description: "Tokens ranked by popularity — profile views, holders, and activity.",
    variant: "trending" as const,
    group: "popular" as const,
  },
  {
    id: "verified",
    label: "Verified",
    description: "Projects from verified creators.",
    variant: "grid" as const,
    group: "popular" as const,
  },
  {
    id: "hot",
    label: "Hot",
    description: "Fast-moving tokens gaining holders and attention.",
    variant: "trending" as const,
    group: "popular" as const,
  },
  {
    id: "top-token",
    label: "Top Token",
    description: "Highest-ranked tokens by trust and volume.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "views",
    label: "Most Viewed",
    description: "Tokens with the most profile views.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "gainer",
    label: "Gainer",
    description: "Tokens with the strongest 24h volume momentum.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "loser",
    label: "Loser",
    description: "Tokens with the weakest recent volume activity.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "latest",
    label: "Latest",
    description: "Most recently added tokens on the platform.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "featured",
    label: "Featured",
    description: "Hand-picked featured projects.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "recently-verified",
    label: "Recently Verified",
    description: "Projects with approved contract verification.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "holders",
    label: "Most Holders",
    description: "Tokens with the largest holder counts.",
    variant: "grid" as const,
    group: "more" as const,
  },
  {
    id: "updated",
    label: "Recently Updated",
    description: "Projects updated most recently.",
    variant: "grid" as const,
    group: "more" as const,
  },
] as const;

export type DiscoverBrowseSectionId = (typeof discoverBrowseSections)[number]["id"];

export function isDiscoverBrowseSectionId(value: string | null): value is DiscoverBrowseSectionId {
  return discoverBrowseSections.some((s) => s.id === value);
}

export function getDiscoverSectionMeta(sectionId: DiscoverBrowseSectionId) {
  return discoverBrowseSections.find((s) => s.id === sectionId)!;
}

export const discoverPopularSections = discoverBrowseSections.filter((s) => s.group === "popular");
export const discoverMoreSections = discoverBrowseSections.filter((s) => s.group === "more");
