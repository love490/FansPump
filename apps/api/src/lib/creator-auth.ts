import { verifyMessage } from "viem";

export class CreatorAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireCreatorActionAuth(input: {
  walletAddress: string;
  message: string;
  signature: string;
  expectedPrefix?: string;
}) {
  const wallet = input.walletAddress.toLowerCase() as `0x${string}`;
  const prefix =
    input.expectedPrefix ??
    process.env.CREATOR_MESSAGE_PREFIX ??
    process.env.NEXT_PUBLIC_CREATOR_MESSAGE_PREFIX ??
    "FansPump Creator Action";

  if (!input.message.startsWith(prefix)) {
    throw new CreatorAuthError("Invalid authorization message", 400);
  }

  const valid = await verifyMessage({
    address: wallet,
    message: input.message,
    signature: input.signature as `0x${string}`,
  });

  if (!valid) throw new CreatorAuthError("Signature verification failed", 401);

  return wallet;
}
