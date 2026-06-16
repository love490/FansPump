import type { TokenCardData } from "@/lib/tokens/token-card-data";

export function sortTokensTrending(tokens: TokenCardData[]): TokenCardData[] {
  return [...tokens].sort((a, b) => {
    const views = (b.viewCount ?? 0) - (a.viewCount ?? 0);
    if (views !== 0) return views;
    const holders = (b.holderCount ?? 0) - (a.holderCount ?? 0);
    if (holders !== 0) return holders;
    return (b.volume24h ?? 0) - (a.volume24h ?? 0);
  });
}

export function sortTokensNewest(tokens: TokenCardData[]): TokenCardData[] {
  return [...tokens].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );
}

/** Fill preview sections from a shared pool when a dedicated query is empty. */
export function buildHomePreviewSections(input: {
  market: TokenCardData[];
  trending: TokenCardData[];
  newest: TokenCardData[];
  previewLimit?: number;
}) {
  const limit = input.previewLimit ?? 24;
  const pool = dedupeTokens([...input.market, ...input.trending, ...input.newest]);

  const trending =
    input.trending.length > 0
      ? input.trending
      : sortTokensTrending(pool).slice(0, limit);

  const newest =
    input.newest.length > 0 ? input.newest : sortTokensNewest(pool).slice(0, limit);

  return { trending, newest };
}

function dedupeTokens(tokens: TokenCardData[]): TokenCardData[] {
  const seen = new Set<string>();
  const out: TokenCardData[] = [];
  for (const token of tokens) {
    const key = (token.contractAddress || token.id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out;
}
