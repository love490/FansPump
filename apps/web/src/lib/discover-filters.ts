import type { Prisma } from "@iopn/database";
import { isTokenCategory, type TokenCategoryId } from "@iopn/shared";

export type DiscoverFilterParams = {
  category?: TokenCategoryId;
  verified?: boolean;
  liquidityLocked?: boolean;
  ownershipRenounced?: boolean;
};

export function parseDiscoverFilters(searchParams: URLSearchParams): DiscoverFilterParams {
  const category = searchParams.get("category");
  return {
    category: category && isTokenCategory(category) ? category : undefined,
    verified: searchParams.get("verified") === "true",
    liquidityLocked: searchParams.get("liquidityLocked") === "true",
    ownershipRenounced: searchParams.get("ownershipRenounced") === "true",
  };
}

export function buildDiscoverWhere(
  chainId: number,
  filters: DiscoverFilterParams
): Prisma.TokenProjectWhereInput {
  const and: Prisma.TokenProjectWhereInput[] = [{ chainId }];

  if (filters.category) {
    and.push({ category: filters.category });
  }

  if (filters.verified) {
    and.push({ creator: { verification: { isNot: null } } });
  }

  if (filters.ownershipRenounced) {
    and.push({ ownershipRenounced: true });
  }

  if (filters.liquidityLocked) {
    and.push({
      OR: [
        { liquidityLocks: { some: {} } },
        { lpBurns: { some: {} } },
      ],
    });
  }

  return and.length === 1 ? and[0] : { AND: and };
}
