import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";

const STORAGE_PREFIX = "fanspump:burn-address:";

/** Deterministic per-token burn wallet — private key is discarded after address generation. */
export function getOrCreateBurnAddress(tokenAddress: string, creatorAddress: string): Address {
  const key = `${STORAGE_PREFIX}${tokenAddress.toLowerCase()}:${creatorAddress.toLowerCase()}`;

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(key);
    if (stored && /^0x[a-fA-F0-9]{40}$/.test(stored)) {
      return stored as Address;
    }
  }

  const account = privateKeyToAccount(generatePrivateKey());
  const address = account.address;

  if (typeof window !== "undefined") {
    localStorage.setItem(key, address);
  }

  return address;
}
