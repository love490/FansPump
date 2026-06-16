import { Router } from "express";
import { type Prisma } from "@iopn/database";
import { isAddress } from "viem";
import { getActiveChainId } from "@/lib/chain-config/opn";
import {
  getPopularRegistryTokens,
  registryToSwapToken,
  searchRegistryTokens,
} from "@/lib/token-registry";
import { buildDiscoverWhere, parseDiscoverFilters } from "@/lib/discover-filters";
import { mapTokenListRow, mapTokenListRowSafe, tokenListSelect } from "@/lib/analytics/token-list";
import {
  buildHomePreviewSections,
  sortTokensNewest,
  sortTokensTrending,
} from "@/lib/tokens/home-sections";
import prisma from "../lib/prisma";
import { asyncHandler, getRouteParam, queryToSearchParams, setCacheControl } from "../lib/http-helpers";
import { notImplemented } from "../lib/route-utils";
import { optionalAuthMiddleware } from "../middleware/auth";
import { publicRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(publicRateLimit);
router.use(optionalAuthMiddleware);

const POOL_LIMIT = 100;
const MARKET_LIMIT = 50;
const PREVIEW_LIMIT = 24;

router.get(
  "/home",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());

    try {
      const rows = await prisma.tokenProject.findMany({
        where: { chainId },
        orderBy: { createdAt: "desc" },
        take: POOL_LIMIT,
        select: tokenListSelect,
      });

      const pool = mapTokenListRowSafe(rows);

      const market = [...pool]
        .sort(
          (a, b) =>
            (b.trustScore ?? 0) - (a.trustScore ?? 0) ||
            (b.volumeTotal ?? 0) - (a.volumeTotal ?? 0)
        )
        .slice(0, MARKET_LIMIT);

      const { trending, newest } = buildHomePreviewSections({
        market,
        trending: sortTokensTrending(pool).slice(0, PREVIEW_LIMIT),
        newest: sortTokensNewest(pool).slice(0, PREVIEW_LIMIT),
        previewLimit: PREVIEW_LIMIT,
      });

      setCacheControl(res, "public, s-maxage=15, stale-while-revalidate=30");
      res.json({ market, trending, new: newest });
    } catch (e) {
      console.error("[GET /api/tokens/home]", e);
      res.status(500).json({ error: "Failed to load home tokens" });
    }
  })
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());

    if (!q) {
      res.json({ tokens: [] });
      return;
    }

    try {
      const tokens = await prisma.tokenProject.findMany({
        where: {
          chainId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { symbol: { contains: q, mode: "insensitive" } },
            { contractAddress: { contains: q.toLowerCase() } },
          ],
        },
        orderBy: [{ volume24h: "desc" }, { createdAt: "desc" }],
        take: limit,
        select: tokenListSelect,
      });

      setCacheControl(res, "public, s-maxage=5, stale-while-revalidate=15");
      res.json({ tokens: tokens.map(mapTokenListRow) });
    } catch (e) {
      console.error("[GET /api/tokens/search]", e);
      res.status(500).json({ error: "Search failed" });
    }
  })
);

router.get(
  "/trending",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 500);
    const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());
    const filters = parseDiscoverFilters(searchParams);

    try {
      const tokens = await prisma.tokenProject.findMany({
        where: buildDiscoverWhere(chainId, filters),
        orderBy: [
          { viewCount: "desc" },
          { holderCount: "desc" },
          { volume24h: "desc" },
          { txCount24h: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        select: tokenListSelect,
      });

      setCacheControl(res, "public, s-maxage=10, stale-while-revalidate=20");
      res.json({ tokens: tokens.map(mapTokenListRow) });
    } catch (e) {
      console.error("[GET /api/tokens/trending]", e);
      res.status(500).json({ error: "Failed to load trending tokens" });
    }
  })
);

router.get(
  "/latest",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 100);
    const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());
    const filters = parseDiscoverFilters(searchParams);

    try {
      const tokens = await prisma.tokenProject.findMany({
        where: buildDiscoverWhere(chainId, filters),
        orderBy: { createdAt: "desc" },
        take: limit,
        select: tokenListSelect,
      });

      setCacheControl(res, "public, s-maxage=10, stale-while-revalidate=20");
      res.json({ tokens: tokens.map(mapTokenListRow) });
    } catch (e) {
      console.error("[GET /api/tokens/latest]", e);
      res.status(500).json({ error: "Failed to load latest tokens" });
    }
  })
);

router.get(
  "/:address",
  asyncHandler(async (req, res) => {
    try {
      const address = getRouteParam(req.params.address);
      const token = await prisma.tokenProject.findUnique({
        where: { contractAddress: address.toLowerCase() },
        include: {
          creator: { include: { verification: true } },
          votes: true,
          liquidityLocks: { select: { id: true }, take: 1 },
          lpBurns: { select: { id: true }, take: 1 },
        },
      });

      if (!token) {
        res.status(404).json({ error: "Token not found" });
        return;
      }

      await prisma.tokenProject.update({
        where: { id: token.id },
        data: { viewCount: { increment: 1 } },
      });

      const voteCounts = token.votes.reduce(
        (acc, v) => {
          acc[v.voteType] = (acc[v.voteType] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const { votes, liquidityLocks, lpBurns, ...tokenFields } = token;

      res.json({
        token: {
          ...tokenFields,
          featureFlags: token.featureFlags.toString(),
          creatorVerified: !!token.creator?.verification,
          creatorUsername: token.creator?.username ?? null,
          liquidityLocked: liquidityLocks.length > 0 || lpBurns.length > 0,
          voteCounts,
        },
      });
    } catch (e) {
      console.error("[GET /api/tokens/:address]", e);
      const detail = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        error: "Database error",
        ...(process.env.NODE_ENV !== "production" ? { detail } : {}),
      });
    }
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const searchParams = queryToSearchParams(req.query);
    const section = searchParams.get("section") ?? "new";
    const q = searchParams.get("q")?.trim() ?? "";
    const creator = searchParams.get("creator")?.trim() ?? "";
    const creatorNormalized = creator ? creator.toLowerCase() : "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 500);
    const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());
    const discoverFilters = parseDiscoverFilters(searchParams);
    const hasDiscoverFilters =
      discoverFilters.category ||
      discoverFilters.verified ||
      discoverFilters.liquidityLocked ||
      discoverFilters.ownershipRenounced;

    if (creatorNormalized && !isAddress(creatorNormalized)) {
      console.warn("[GET /api/tokens] Invalid creator address:", creator);
      res.status(400).json({ error: "Invalid creator wallet address" });
      return;
    }

    if (creatorNormalized) {
      console.log("[GET /api/tokens] Creator query:", creatorNormalized, "chainId:", chainId);
    }

    if (section === "registry") {
      const registry = getPopularRegistryTokens()
        .map(registryToSwapToken)
        .filter((t): t is NonNullable<typeof t> => t !== null);
      res.json({ tokens: registry, source: "registry" });
      return;
    }

    const chainFilter: Prisma.TokenProjectWhereInput = hasDiscoverFilters
      ? buildDiscoverWhere(chainId, discoverFilters)
      : { chainId };

    const orderBy =
      section === "all"
        ? { createdAt: "desc" as const }
        : section === "trending"
          ? [
              { viewCount: "desc" as const },
              { holderCount: "desc" as const },
              { volume24h: "desc" as const },
              { txCount24h: "desc" as const },
            ]
          : section === "hot" || section === "fastest-growing"
            ? [{ holderCount: "desc" as const }, { trendingScore: "desc" as const }]
            : section === "views"
              ? { viewCount: "desc" as const }
              : section === "holders"
                ? { holderCount: "desc" as const }
                : section === "gainer"
                  ? { volume24h: "desc" as const }
                  : section === "loser"
                    ? { volume24h: "asc" as const }
                    : section === "top-token"
                      ? [{ trustScore: "desc" as const }, { volumeTotal: "desc" as const }]
                      : section === "most-trusted"
                        ? { trustScore: "desc" as const }
                        : section === "fastest-growing"
                          ? [{ holderCount: "desc" as const }, { trendingScore: "desc" as const }]
                          : section === "recently-verified"
                            ? { verificationSubmittedAt: "desc" as const }
                            : section === "updated"
                              ? { updatedAt: "desc" as const }
                              : section === "featured"
                                ? undefined
                                : { createdAt: "desc" as const };

    const sectionFilterExtra: Prisma.TokenProjectWhereInput | undefined =
      section === "recently-verified"
        ? { verificationStatus: "APPROVED" }
        : section === "top-builders"
          ? undefined
          : undefined;

    const searchFilter: Prisma.TokenProjectWhereInput | undefined = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { symbol: { contains: q, mode: "insensitive" as const } },
            { contractAddress: { contains: q.toLowerCase() } },
          ],
        }
      : undefined;

    const sectionFilter: Prisma.TokenProjectWhereInput | undefined =
      creatorNormalized || q
        ? undefined
        : section === "featured"
          ? { isFeatured: true }
          : sectionFilterExtra;

    const creatorFilter: Prisma.TokenProjectWhereInput | undefined = creatorNormalized
      ? { creatorAddress: creatorNormalized }
      : undefined;

    const filters = [chainFilter, sectionFilter, searchFilter, creatorFilter].filter(
      (f): f is Prisma.TokenProjectWhereInput => !!f
    );

    const where: Prisma.TokenProjectWhereInput =
      filters.length === 0 ? chainFilter : filters.length === 1 ? filters[0] : { AND: filters };

    try {
      if (section === "top-builders" && !creatorNormalized && !q) {
        const topCreators = await prisma.creatorProfile.findMany({
          orderBy: [{ reputationScore: "desc" }, { fansPumpXp: "desc" }],
          take: 30,
          select: { walletAddress: true },
        });
        const topWallets = topCreators.map((c) => c.walletAddress);
        const topBuilderWhere: Prisma.TokenProjectWhereInput =
          topWallets.length > 0
            ? { AND: [chainFilter, { creatorAddress: { in: topWallets } }] }
            : chainFilter;

        const tokens = await prisma.tokenProject.findMany({
          where: topBuilderWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: tokenListSelect,
        });
        res.json({ tokens: tokens.map(mapTokenListRow), section });
        return;
      }

      const tokens = await prisma.tokenProject.findMany({
        where,
        orderBy: q ? { createdAt: "desc" as const } : (orderBy ?? { createdAt: "desc" }),
        take: q ? Math.min(limit, 20) : limit,
        select: tokenListSelect,
      });

      const enriched = tokens.map(mapTokenListRow);

      let responseTokens = enriched;

      if (creatorNormalized && enriched.length > 0) {
        const tokenIds = enriched.map((t) => t.id);
        const earningRows = await prisma.creatorEarning.findMany({
          where: { tokenId: { in: tokenIds }, creatorAddress: creatorNormalized },
          select: { tokenId: true, amount: true },
        });
        const earningsMap = new Map<string, bigint>();
        for (const row of earningRows) {
          const prev = earningsMap.get(row.tokenId) ?? 0n;
          earningsMap.set(row.tokenId, prev + BigInt(row.amount));
        }
        responseTokens = enriched.map((t) => ({
          ...t,
          creatorEarningsWei: (earningsMap.get(t.id) ?? 0n).toString(),
        }));
      }

      const cacheControl = creatorNormalized
        ? "private, max-age=5, stale-while-revalidate=15"
        : section === "new"
          ? "public, s-maxage=5, stale-while-revalidate=10"
          : "public, s-maxage=15, stale-while-revalidate=30";

      if (q) {
        const registryHits = searchRegistryTokens(q)
          .map(registryToSwapToken)
          .filter((t): t is NonNullable<typeof t> => t !== null)
          .map((t) => ({
            ...t,
            id: t.contractAddress,
            chainId,
            creatorVerified: false,
            isFeatured: false,
            featureFlags: "0",
          }));
        const seen = new Set(enriched.map((t) => t.contractAddress.toLowerCase()));
        const merged = [
          ...registryHits.filter((t) => !seen.has(t.contractAddress.toLowerCase())),
          ...enriched,
        ];
        setCacheControl(res, cacheControl);
        res.json({ tokens: merged.slice(0, limit) });
        return;
      }

      setCacheControl(res, cacheControl);
      res.json({ tokens: responseTokens });
    } catch (e) {
      console.error("[GET /api/tokens] Prisma error:", e);
      res.status(500).json({ error: "Database error", detail: String(e) });
    }
  })
);

router.post("/", notImplemented);
router.patch("/:address", notImplemented);

export default router;
