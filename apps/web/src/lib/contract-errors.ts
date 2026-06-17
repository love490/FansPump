/** Short, user-facing message from viem/wagmi contract errors. */
export function formatContractError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes("insufficient balance")) {
    const feeMatch = raw.match(/value:\s*([\d.]+)\s*OPN/i);
    const fee = feeMatch?.[1];
    return fee
      ? `Not enough OPN in your wallet. You need at least ${fee} OPN plus gas to deploy. Top up and try again.`
      : "Not enough OPN in your wallet for the creation fee and gas. Top up and try again.";
  }

  if (lower.includes("user rejected") || lower.includes("rejected the request")) {
    return "Transaction cancelled in your wallet.";
  }

  if (lower.includes("would fail on-chain") || lower.includes("execution reverted")) {
    return "Transaction would fail on-chain. Check tax settings, features, and your OPN balance.";
  }

  const details = raw.match(/Details:\s*([^\n]+)/i)?.[1]?.trim();
  if (details && details.length <= 160) return details;

  const reason = raw.match(/Reason:\s*([^\n]+)/i)?.[1]?.trim();
  if (reason && reason.length <= 160) return reason;

  const firstLine = raw.split("\n")[0]?.trim() ?? raw;
  if (firstLine.length <= 180) return firstLine;

  return `${firstLine.slice(0, 177)}…`;
}
