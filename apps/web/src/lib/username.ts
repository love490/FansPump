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
  if (username) return username;
  if (walletAddress) return shorten(walletAddress, 4);
  return "—";
}
