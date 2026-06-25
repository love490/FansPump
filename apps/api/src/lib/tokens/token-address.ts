import { isAddress } from "viem";

export const NATIVE_OPN_ID = "native-opn";

const NATIVE_SLUGS = new Set(["native-opn", "native", "opn"]);

export type NormalizedTokenRoute =
  | { kind: "native-opn" }
  | { kind: "address"; address: string };

export function normalizeTokenRouteParam(raw: string): NormalizedTokenRoute | null {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (NATIVE_SLUGS.has(lower)) return { kind: "native-opn" };
  if (isAddress(trimmed)) return { kind: "address", address: lower };
  return null;
}

export function isNativeOpnSlug(raw: string): boolean {
  return NATIVE_SLUGS.has(raw.trim().toLowerCase());
}
