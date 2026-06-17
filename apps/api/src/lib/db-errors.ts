export function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|Unknown table|P2021|P2022|relation.*does not exist/i.test(message);
}

export async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[safeQuery] ${label} failed:`, error);
    return fallback;
  }
}
