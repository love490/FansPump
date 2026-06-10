import { type Address, type Hash, type PublicClient } from "viem";
import { erc20Abi } from "@/lib/swap/abis";

const wopnWrapAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

type WriteContractAsync = (args: {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}) => Promise<Hash>;

export async function readWopnBalance(
  client: PublicClient,
  wopnAddress: Address,
  owner: Address
): Promise<bigint> {
  return client.readContract({
    address: wopnAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function wrapOpnToWopn(params: {
  wopnAddress: Address;
  amount: bigint;
  writeContractAsync: WriteContractAsync;
  waitForTx: (hash: Hash) => Promise<unknown>;
}): Promise<Hash> {
  if (params.amount <= 0n) {
    throw new Error("Wrap amount must be greater than zero");
  }

  const hash = await params.writeContractAsync({
    address: params.wopnAddress,
    abi: wopnWrapAbi,
    functionName: "deposit",
    value: params.amount,
  });
  await params.waitForTx(hash);
  return hash;
}

/** Wrap native OPN into WOPN when balance is below the required amount. */
export async function ensureWopnBalance(params: {
  client: PublicClient;
  wopnAddress: Address;
  owner: Address;
  required: bigint;
  writeContractAsync: WriteContractAsync;
  waitForTx: (hash: Hash) => Promise<unknown>;
}): Promise<boolean> {
  const balance = await readWopnBalance(params.client, params.wopnAddress, params.owner);
  if (balance >= params.required) return false;

  const deficit = params.required - balance;
  await wrapOpnToWopn({
    wopnAddress: params.wopnAddress,
    amount: deficit,
    writeContractAsync: params.writeContractAsync,
    waitForTx: params.waitForTx,
  });
  return true;
}
