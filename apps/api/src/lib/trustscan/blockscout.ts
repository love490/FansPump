import { opnChainConfig } from "@/lib/chain-config/opn";

function explorerApiBase(): string {
  const env = process.env.BLOCK_EXPLORER_API?.trim();
  if (env) return env.replace(/\/$/, "");
  return opnChainConfig.explorerUrl.replace(/\/$/, "");
}

async function get(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${explorerApiBase()}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getContractInfo(address: string) {
  return get(`/api/v2/smart-contracts/${address.toLowerCase()}`);
}

export async function getTokenInfo(address: string) {
  return get(`/api/v2/tokens/${address.toLowerCase()}`);
}

export async function getTokenHolders(address: string) {
  return get(`/api/v2/tokens/${address.toLowerCase()}/holders?limit=20`);
}

export async function getAddressInfo(address: string) {
  return get(`/api/v2/addresses/${address.toLowerCase()}`);
}

export async function getAddressTxs(address: string) {
  return get(`/api/v2/addresses/${address.toLowerCase()}/transactions?limit=50`);
}

export async function getDeployedContracts(walletAddress: string) {
  return get(
    `/api/v2/addresses/${walletAddress.toLowerCase()}/transactions?filter=from&type=contract_creation&limit=50`
  );
}

export async function getAddressTokens(walletAddress: string, query = "") {
  const suffix = query ? `?${query}` : "";
  return get(`/api/v2/addresses/${walletAddress.toLowerCase()}/tokens${suffix}`);
}
