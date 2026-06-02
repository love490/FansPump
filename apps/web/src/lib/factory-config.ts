import { isAddress, zeroAddress } from "viem";

const ZERO = zeroAddress.toLowerCase();

export function getFactoryAddress(): `0x${string}` {
  return (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`;
}

export function isFactoryConfigured(address?: string | null): boolean {
  if (!address) return false;
  if (!isAddress(address)) return false;
  return address.toLowerCase() !== ZERO;
}

export function getFactoryConfigError(): string | null {
  const raw = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  if (!raw || raw.trim() === "") {
    return "Factory contract not configured. Set NEXT_PUBLIC_FACTORY_ADDRESS in your deployment environment.";
  }
  if (!isAddress(raw)) {
    return "Factory contract address is invalid. Check NEXT_PUBLIC_FACTORY_ADDRESS.";
  }
  if (raw.toLowerCase() === ZERO) {
    return "Factory contract not configured. NEXT_PUBLIC_FACTORY_ADDRESS cannot be the zero address.";
  }
  return null;
}
