const STORAGE_PREFIX = "fanspump-imported-tokens";
const MAX_IMPORTED = 100;

export type ImportedToken = {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string | null;
  importedAt: number;
};

function storageKey(wallet: string) {
  return `${STORAGE_PREFIX}:${wallet.toLowerCase()}`;
}

function isImportedToken(value: unknown): value is ImportedToken {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Partial<ImportedToken>;
  return (
    typeof t.contractAddress === "string" &&
    t.contractAddress.startsWith("0x") &&
    typeof t.symbol === "string" &&
    Number.isFinite(t.decimals)
  );
}

export function readImportedTokens(wallet: string | undefined): ImportedToken[] {
  if (!wallet || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(wallet));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isImportedToken);
  } catch {
    return [];
  }
}

function write(wallet: string, tokens: ImportedToken[]): ImportedToken[] {
  const capped = tokens.slice(-MAX_IMPORTED);
  try {
    window.localStorage.setItem(storageKey(wallet), JSON.stringify(capped));
  } catch {
    // Storage unavailable; imports simply will not persist across reloads.
  }
  return capped;
}

export function saveImportedToken(
  wallet: string | undefined,
  token: Omit<ImportedToken, "importedAt">
): ImportedToken[] {
  if (!wallet || typeof window === "undefined") return [];
  const address = token.contractAddress.toLowerCase();
  const existing = readImportedTokens(wallet).filter(
    (t) => t.contractAddress.toLowerCase() !== address
  );
  existing.push({ ...token, contractAddress: address, importedAt: Date.now() });
  return write(wallet, existing);
}

export function removeImportedToken(
  wallet: string | undefined,
  contractAddress: string
): ImportedToken[] {
  if (!wallet || typeof window === "undefined") return [];
  const address = contractAddress.toLowerCase();
  return write(
    wallet,
    readImportedTokens(wallet).filter((t) => t.contractAddress.toLowerCase() !== address)
  );
}
