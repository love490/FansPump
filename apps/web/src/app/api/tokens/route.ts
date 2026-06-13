import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@iopn/database";
import { z } from "zod";
import { isAddress } from "viem";
import { getActiveChainId } from "@/lib/chain-config/opn";
import {
  getPopularRegistryTokens,
  registryToSwapToken,
  searchRegistryTokens,
} from "@/lib/token-registry";
import { initializeTokenAnalytics } from "@/lib/analytics/token-init";
import { isTokenCategory } from "@iopn/shared";
import { buildDiscoverWhere, parseDiscoverFilters } from "@/lib/discover-filters";
import { mapTokenListRow, tokenListSelect } from "@/lib/analytics/token-list";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const optionalImageUrl = z.preprocess(
  emptyToNull,
  z
    .union([
      z.string().url(),
      z.string().regex(/^\/uploads\/projects\/[a-zA-Z0-9._-]+$/),
      z.null(),
    ])
    .optional()
);

const optionalUrl = z.preprocess(emptyToNull, z.string().url().nullable().optional());
const optionalText = z.preprocess(emptyToNull, z.string().nullable().optional());

const createSchema = z.object({
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int(),
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(16),
  initialSupply: z.string(),
  featureFlags: z.string(),
  creatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  factoryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  txHash: z.string().optional(),
  logoUrl: optionalImageUrl,
  bannerUrl: optionalImageUrl,
  description: z.string().max(5000).optional().nullable(),
  website: optionalUrl,
  telegram: optionalText,
  twitter: optionalText,
  discord: optionalText,
  github: optionalUrl,
  buyTaxBps: z.number().int().optional().nullable(),
  sellTaxBps: z.number().int().optional().nullable(),
  maxWallet: z.string().optional().nullable(),
  maxTx: z.string().optional().nullable(),
  category: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
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
    return NextResponse.json({ error: "Invalid creator wallet address" }, { status: 400 });
  }

  if (creatorNormalized) {
    console.log("[GET /api/tokens] Creator query:", creatorNormalized, "chainId:", chainId);
  }

  if (section === "registry") {
    const registry = getPopularRegistryTokens()
      .map(registryToSwapToken)
      .filter((t): t is NonNullable<typeof t> => t !== null);
    return NextResponse.json({ tokens: registry, source: "registry" });
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
      return NextResponse.json({ tokens: tokens.map(mapTokenListRow), section });
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
      return NextResponse.json({ tokens: merged.slice(0, limit) }, { headers: { "Cache-Control": cacheControl } });
    }

    return NextResponse.json({ tokens: responseTokens }, { headers: { "Cache-Control": cacheControl } });
  } catch (e) {
    console.error("[GET /api/tokens] Prisma error:", e);
    return NextResponse.json({ error: "Database error", detail: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    console.log("[POST /api/tokens] Registering token:", raw?.contractAddress, "creator:", raw?.creatorAddress);

    const body = createSchema.parse({
      ...raw,
      contractAddress: typeof raw?.contractAddress === "string" ? raw.contractAddress.toLowerCase() : raw?.contractAddress,
      creatorAddress: typeof raw?.creatorAddress === "string" ? raw.creatorAddress.toLowerCase() : raw?.creatorAddress,
      factoryAddress: typeof raw?.factoryAddress === "string" ? raw.factoryAddress.toLowerCase() : raw?.factoryAddress,
    });

    await prisma.user.upsert({
      where: { walletAddress: body.creatorAddress },
      create: { walletAddress: body.creatorAddress },
      update: {},
    });

    const category =
      body.category && isTokenCategory(body.category) ? body.category : "OTHER";

    const data = {
      chainId: body.chainId,
      name: body.name,
      symbol: body.symbol,
      initialSupply: body.initialSupply,
      featureFlags: BigInt(body.featureFlags),
      creatorAddress: body.creatorAddress,
      factoryAddress: body.factoryAddress,
      txHash: body.txHash,
      logoUrl: body.logoUrl,
      bannerUrl: body.bannerUrl,
      description: body.description,
      website: body.website,
      telegram: body.telegram,
      twitter: body.twitter,
      discord: body.discord,
      github: body.github,
      buyTaxBps: body.buyTaxBps,
      sellTaxBps: body.sellTaxBps,
      maxWallet: body.maxWallet,
      maxTx: body.maxTx,
      category,
    };

    const token = await prisma.tokenProject.upsert({
      where: { contractAddress: body.contractAddress },
      create: {
        contractAddress: body.contractAddress,
        trendingScore: Date.now(),
        ...data,
      },
      update: {
        ...data,
        trendingScore: Date.now(),
      },
    });

    console.log("[POST /api/tokens] Saved token:", token.contractAddress, "id:", token.id);

    await initializeTokenAnalytics({
      tokenId: token.id,
      tokenAddress: token.contractAddress,
    });

    return NextResponse.json({
      success: true,
      contractAddress: token.contractAddress,
      token: {
        ...token,
        featureFlags: token.featureFlags.toString(),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      console.error("[POST /api/tokens] Validation error:", msg);
      return NextResponse.json({ error: msg || "Invalid token data" }, { status: 400 });
    }
    console.error("[POST /api/tokens] Failed to register token:", e);
    return NextResponse.json(
      {
        error: "Failed to register token",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
