import type { Address } from "viem";
import { opnChainConfig } from "@/lib/chain-config/opn";

export const DEAD_BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD" as Address;

export const LIQUIDITY_LOCKER_ADDRESS = opnChainConfig.contracts.liquidityLocker;
