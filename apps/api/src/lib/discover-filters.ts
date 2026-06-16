import { type Prisma, type TokenCategory } from "@iopn/database";

export interface DiscoverFilters {
  category?: string;
  verified?: boolean;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
}

export function parseDiscoverFilters(
  searchParams: URLSearchParams
): DiscoverFilters {
  const category = searchParams.get("category") ?? undefined;
  const verified = searchParams.get("verified") === "true" ? true : undefined;
  const liquidityLocked =
    searchParams.get("liquidityLocked") === "true" ? true : undefined;
  const ownershipRenounced =
    searchParams.get("ownershipRenounced") === "true" ? true : undefined;

  return { category, verified, liquidityLocked, ownershipRenounced };
}

export function buildDiscoverWhere(
  chainId: number,
  filters: DiscoverFilters
): Prisma.TokenProjectWhereInput {
  const conditions: Prisma.TokenProjectWhereInput[] = [{ chainId }];

  if (filters.category) {
    conditions.push({ category: filters.category as TokenCategory });
  }

  if (filters.verified) {
    conditions.push({ verificationStatus: "APPROVED" });
  }

  if (filters.liquidityLocked) {
    conditions.push({
      OR: [
        { liquidityLocks: { some: {} } },
        { lpBurns: { some: {} } },
      ],
    });
  }

  if (filters.ownershipRenounced) {
    conditions.push({ ownershipRenounced: true });
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}