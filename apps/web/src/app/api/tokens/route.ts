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
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "new";
  const q = searchParams.get("q")?.trim() ?? "";
  const creator = searchParams.get("creator")?.trim() ?? "";
  const creatorNormalized = creator ? creator.toLowerCase() : "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 24), 100);
  const chainId = Number(searchParams.get("chainId") ?? getActiveChainId());

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

  const chainFilter: Prisma.TokenProjectWhereInput = { chainId };

  const orderBy =
    section === "trending"
      ? { trendingScore: "desc" as const }
      : section === "views"
        ? { viewCount: "desc" as const }
        : section === "holders"
          ? { holderCount: "desc" as const }
          : section === "updated"
            ? { updatedAt: "desc" as const }
            : section === "featured"
              ? undefined
              : { createdAt: "desc" as const };

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
    creatorNormalized || q ? undefined : section === "featured" ? { isFeatured: true } : undefined;

  const creatorFilter: Prisma.TokenProjectWhereInput | undefined = creatorNormalized
    ? { creatorAddress: creatorNormalized }
    : undefined;

  const filters = [chainFilter, sectionFilter, searchFilter, creatorFilter].filter(
    (f): f is Prisma.TokenProjectWhereInput => !!f
  );

  const where: Prisma.TokenProjectWhereInput =
    filters.length === 0 ? chainFilter : filters.length === 1 ? filters[0] : { AND: filters };

  const tokens = await prisma.tokenProject.findMany({
    where,
    orderBy: q ? { createdAt: "desc" as const } : (orderBy ?? { createdAt: "desc" }),
    take: q ? Math.min(limit, 20) : limit,
    select: {
      id: true,
      contractAddress: true,
      chainId: true,
      name: true,
      symbol: true,
      logoUrl: true,
      description: true,
      viewCount: true,
      holderCount: true,
      isFeatured: true,
      featureFlags: true,
      createdAt: true,
      creator: { select: { verification: { select: { id: true } } } },
    },
  });

  const enriched = tokens.map((t) => ({
    ...t,
    featureFlags: t.featureFlags.toString(),
    creatorVerified: !!t.creator?.verification,
  }));

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

  return NextResponse.json({ tokens: enriched }, { headers: { "Cache-Control": cacheControl } });
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
    return NextResponse.json({ error: "Failed to register token" }, { status: 500 });
  }
}
