import { isAddress } from "viem";
import { getPublicClient } from "@/lib/rpc-client";
import type { AddressType } from "./types";

export async function detectAddressType(address: string): Promise<AddressType> {
  if (!isAddress(address)) return "unknown";

  try {
    const client = getPublicClient();
    const code = await client.getBytecode({
      address: address as `0x${string}`,
    });

    if (code && code !== "0x" && code.length > 2) return "token";
    return "wallet";
  } catch {
    return "unknown";
  }
}
