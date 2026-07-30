const FALLBACK_EXPLORER = "https://testnet.iopn.tech";

function explorerBase(): string {
  const raw = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? FALLBACK_EXPLORER;
  return raw.replace(/\/$/, "");
}

export function explorerTxUrl(hash: string): string {
  return `${explorerBase()}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${explorerBase()}/address/${address}`;
}

export function explorerTokenUrl(address: string): string {
  return `${explorerBase()}/token/${address}`;
}
