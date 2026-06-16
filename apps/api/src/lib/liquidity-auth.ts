import { verifyMessage } from "viem";

export class LiquidityAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireLiquidityActionAuth(input: {
  walletAddress: string;
  message: string;
  signature: string;
  expectedPrefix?: string;
}) {
  const wallet = input.walletAddress.toLowerCase() as `0x${string}`;
  const prefix =
    input.expectedPrefix ??
    process.env.LIQUIDITY_MESSAGE_PREFIX ??
    "FansPump Liquidity Action";

  if (!input.message.startsWith(prefix)) {
    throw new LiquidityAuthError("Invalid authorization message", 400);
  }

  const valid = await verifyMessage({
    address: wallet,
    message: input.message,
    signature: input.signature as `0x${string}`,
  });

  if (!valid) throw new LiquidityAuthError("Signature verification failed", 401);

  return wallet;
}

