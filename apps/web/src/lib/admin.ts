/** Server-only: comma-separated admin wallet addresses (lowercase). */
export function getAdminWallets(): string[] {
  const raw = process.env.ADMIN_WALLET_ADDRESSES ?? "";
  return raw
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^0x[a-f0-9]{40}$/.test(w));
}

export function isAdminWallet(address: string | undefined | null): boolean {
  if (!address) return false;
  return getAdminWallets().includes(address.toLowerCase());
}

export function getAdminMessagePrefix(): string {
  return process.env.ADMIN_MESSAGE_PREFIX ?? "FansPump Admin Authorization";
}

export function getFactoryAdminAddress(): string | null {
  const addr = process.env.FACTORY_ADMIN_ADDRESS?.trim().toLowerCase();
  if (addr && /^0x[a-f0-9]{40}$/.test(addr)) return addr;
  return getAdminWallets()[0] ?? null;
}
