import { keccak256, toBytes, type Hash } from "viem";

/** Future on-chain event topic0 hashes for the analytics indexer. */
export const FEE_COLLECTED_TOPIC = keccak256(toBytes("FeeCollected(address,address,uint256)")) as Hash;
export const SWAP_EXECUTED_TOPIC = keccak256(
  toBytes("SwapExecuted(address,address,uint256,uint256)")
) as Hash;
