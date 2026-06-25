export const NATIVE_OPN_ID = "native-opn";

const NATIVE_SLUGS = new Set(["native-opn", "native", "opn"]);

export function isNativeOpnToken(contractAddress: string, symbol?: string): boolean {
  if (symbol?.toUpperCase() === "OPN") return true;
  const lower = contractAddress.trim().toLowerCase();
  return !lower || NATIVE_SLUGS.has(lower);
}

export function tokenPageHref(contractAddress: string, symbol?: string): string {
  if (isNativeOpnToken(contractAddress, symbol)) {
    return `/token/${NATIVE_OPN_ID}`;
  }
  return `/token/${contractAddress}`;
}

export function swapPageHref(contractAddress: string, symbol?: string): string {
  if (isNativeOpnToken(contractAddress, symbol)) {
    return "/swap";
  }
  return `/swap/${contractAddress}`;
}
