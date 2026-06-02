import {
  type Address,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
  isAddress,
  parseEventLogs,
} from "viem";
import { factoryAbi } from "@/lib/abis/factory";

export class TokenAddressNotFoundError extends Error {
  constructor(message = "Contract address not found in event logs") {
    super(message);
    this.name = "TokenAddressNotFoundError";
  }
}

/** Extract deployed token address from a confirmed factory transaction receipt. */
export function extractTokenAddressFromReceipt(
  receipt: TransactionReceipt,
  factoryAddress: Address
): Address {
  const factory = factoryAddress.toLowerCase();
  const factoryLogs = receipt.logs.filter((log) => log.address.toLowerCase() === factory);

  console.log("[deploy] Parsing receipt logs for TokenCreated…", {
    txHash: receipt.transactionHash,
    logCount: receipt.logs.length,
    factoryLogCount: factoryLogs.length,
  });

  const tokenCreated = parseEventLogs({
    abi: factoryAbi,
    logs: factoryLogs,
    eventName: "TokenCreated",
  });

  for (const event of tokenCreated) {
    const token = event.args.token;
    if (token && isAddress(token)) {
      console.log("[deploy] TokenCreated event — contract address:", token);
      return token;
    }
  }

  // Some deployments may only surface the interface event in traces.
  const tokenDeployed = parseEventLogs({
    abi: [
      {
        type: "event",
        name: "TokenDeployed",
        inputs: [
          { name: "token", type: "address", indexed: true },
          { name: "creator", type: "address", indexed: true },
          { name: "featureFlags", type: "uint256", indexed: false },
        ],
      },
    ] as const,
    logs: receipt.logs,
    eventName: "TokenDeployed",
  });

  for (const event of tokenDeployed) {
    const token = event.args.token;
    if (token && isAddress(token)) {
      console.log("[deploy] TokenDeployed event — contract address:", token);
      return token;
    }
  }

  throw new TokenAddressNotFoundError();
}

/** On-chain fallback: read the latest token from the factory for this creator. */
export async function fetchLatestTokenFromFactory(
  publicClient: PublicClient,
  factoryAddress: Address,
  creatorAddress: Address
): Promise<Address | null> {
  console.log("[deploy] Falling back to factory tokenCount / allTokens lookup…");

  const count = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "tokenCount",
  });

  if (count === 0n) {
    console.warn("[deploy] Factory tokenCount is 0");
    return null;
  }

  const creator = creatorAddress.toLowerCase();

  // Walk backwards — creator may have deployed multiple tokens.
  for (let i = count - 1n; i >= 0n && i >= count - 10n; i--) {
    const token = await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "allTokens",
      args: [i],
    });

    const tokenCreator = await publicClient.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "tokenCreator",
      args: [token],
    });

    if (tokenCreator.toLowerCase() === creator && isAddress(token)) {
      console.log("[deploy] Factory lookup — contract address:", token);
      return token;
    }
  }

  console.warn("[deploy] No matching token found in factory for creator:", creator);
  return null;
}

/** Resolve token address from receipt, then optional on-chain factory lookup. */
export async function resolveDeployedTokenAddress(
  publicClient: PublicClient,
  receipt: TransactionReceipt,
  factoryAddress: Address,
  creatorAddress: Address
): Promise<Address> {
  try {
    return extractTokenAddressFromReceipt(receipt, factoryAddress);
  } catch (err) {
    console.warn("[deploy] Event extraction failed:", err instanceof Error ? err.message : err);
  }

  const fromFactory = await fetchLatestTokenFromFactory(
    publicClient,
    factoryAddress,
    creatorAddress
  );

  if (fromFactory) return fromFactory;

  throw new TokenAddressNotFoundError(
    "Contract address not found in event logs or factory registry"
  );
}

export function isReceiptSuccess(receipt: TransactionReceipt): boolean {
  return receipt.status === "success";
}

export async function waitForDeployReceipt(
  publicClient: PublicClient,
  txHash: Hash
): Promise<TransactionReceipt> {
  console.log("[deploy] Waiting for confirmation… tx hash:", txHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("[deploy] Receipt status:", receipt.status);
  if (!isReceiptSuccess(receipt)) {
    throw new Error("Transaction reverted on-chain");
  }
  return receipt;
}
