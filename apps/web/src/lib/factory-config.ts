import { isAddress, zeroAddress } from "viem";
import { opnChainConfig } from "./chain-config/opn";

const ZERO = zeroAddress.toLowerCase();

/** Resolved factory address — env override or OPN testnet default from chain config. */
export function getFactoryAddress(): `0x${string}` {
  return opnChainConfig.contracts.factory;
}

export function isFactoryConfigured(address?: string | null): boolean {
  const resolved = address ?? getFactoryAddress();
  if (!resolved) return false;
  if (!isAddress(resolved)) return false;
  return resolved.toLowerCase() !== ZERO;
}

export function getFactoryConfigError(): string | null {
  const resolved = getFactoryAddress();
  if (!isAddress(resolved)) {
    return "Factory contract address is invalid. Check NEXT_PUBLIC_FACTORY_ADDRESS.";
  }
  if (resolved.toLowerCase() === ZERO) {
    return "Factory contract not configured. Set NEXT_PUBLIC_FACTORY_ADDRESS in your deployment environment.";
  }
  return null;
}
