import type { ExplorePromoCardEntry, PromoCardsConfig } from "./platform-settings";

type LegacyAnnouncement = {
  id: string;
  title: string;
  tokenSymbol: string;
  tokenName: string;
  href: string;
};

export function sortPromoCards(cards: ExplorePromoCardEntry[]): ExplorePromoCardEntry[] {
  return [...cards].sort((a, b) => a.sortOrder - b.sortOrder || a.headline.localeCompare(b.headline));
}

export function resolvePublicPromoCards(input: {
  config: PromoCardsConfig;
  banner: string;
  announcements: LegacyAnnouncement[];
}): ExplorePromoCardEntry[] {
  const configured = sortPromoCards(input.config.cards.filter((card) => card.enabled));
  if (configured.length > 0) return configured;

  const legacy: ExplorePromoCardEntry[] = [];
  let order = 0;

  if (input.banner.trim()) {
    legacy.push({
      id: "platform-banner",
      enabled: true,
      label: "News",
      headline: input.banner.trim(),
      subtitle: "Platform announcement",
      href: "/discover?section=new",
      sortOrder: order++,
    });
  }

  for (const item of input.announcements) {
    legacy.push({
      id: item.id,
      enabled: true,
      label: "News",
      headline: item.title,
      subtitle: `${item.tokenSymbol} · ${item.tokenName}`,
      href: item.href,
      sortOrder: order++,
    });
  }

  if (legacy.length === 0) {
    legacy.push({
      id: "default-news",
      enabled: true,
      label: "News",
      headline: "New launches",
      subtitle: "See latest tokens on OPN Network",
      href: "/discover?section=new",
      sortOrder: 0,
    });
  }

  return legacy;
}
