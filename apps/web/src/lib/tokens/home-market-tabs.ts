export type HomeMarketTabId =
  | "favorite"
  | "top-token"
  | "views"
  | "gainer"
  | "loser"
  | "hot"
  | "new";

export type HomeMarketTab = {
  id: HomeMarketTabId;
  label: string;
  description: string;
  includeBaseTokens: boolean;
  discoverSection: string;
};

export const HOME_MARKET_TABS: HomeMarketTab[] = [
  {
    id: "favorite",
    label: "Favorite",
    description: "Tokens you added as favorites.",
    includeBaseTokens: true,
    discoverSection: "favorite",
  },
  {
    id: "top-token",
    label: "Top Token",
    description: "Highest-ranked tokens by trust and volume.",
    includeBaseTokens: true,
    discoverSection: "top-token",
  },
  {
    id: "views",
    label: "Most Viewed",
    description: "Tokens with the most profile views.",
    includeBaseTokens: true,
    discoverSection: "views",
  },
  {
    id: "gainer",
    label: "Gainer",
    description: "Tokens with the strongest 24h volume momentum.",
    includeBaseTokens: true,
    discoverSection: "gainer",
  },
  {
    id: "loser",
    label: "Loser",
    description: "Tokens with the weakest recent volume activity.",
    includeBaseTokens: true,
    discoverSection: "loser",
  },
  {
    id: "hot",
    label: "Hot",
    description: "Fast-moving tokens gaining holders and attention.",
    includeBaseTokens: true,
    discoverSection: "hot",
  },
  {
    id: "new",
    label: "New",
    description: "Newly launched tokens — sorted by launch date.",
    includeBaseTokens: true,
    discoverSection: "new",
  },
];

export const DEFAULT_HOME_MARKET_TAB: HomeMarketTabId = "top-token";

export function getHomeMarketTab(id: HomeMarketTabId): HomeMarketTab {
  return HOME_MARKET_TABS.find((t) => t.id === id) ?? HOME_MARKET_TABS[1];
}
