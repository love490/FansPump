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
  return (
    process.env.ADMIN_MESSAGE_PREFIX ??
    process.env.NEXT_PUBLIC_ADMIN_MESSAGE_PREFIX ??
    "FansPump Admin Authorization"
  );
}

export function getFactoryAdminAddress(): string | null {
  const addr = process.env.FACTORY_ADMIN_ADDRESS?.trim().toLowerCase();
  if (addr && /^0x[a-f0-9]{40}$/.test(addr)) return addr;
  return null;
}

/** Wallet attributed to admin-created platform quests (leaderboard + creator profile). */
export function getPlatformCreatorWallet(): string | null {
  const configured = process.env.PLATFORM_CREATOR_WALLET?.trim().toLowerCase();
  if (configured && /^0x[a-f0-9]{40}$/.test(configured)) return configured;
  const admin = getAdminWallets()[0];
  if (admin) return admin;
  return getFactoryAdminAddress();
}
