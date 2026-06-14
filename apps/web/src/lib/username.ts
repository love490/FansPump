const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

/** Display creator as username or shortened wallet. */
export function formatCreatorDisplay(
  username: string | null | undefined,
  walletAddress: string | null | undefined,
  shorten: (addr: string, chars?: number) => string
): string {
  if (username?.trim()) return username.trim();
  if (walletAddress) return shorten(walletAddress, 4);
  return "—";
}

export function creatorProfilePath(walletAddress: string): string {
  return `/creator/${walletAddress.toLowerCase()}`;
}
