export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fanspump.xyz";

/** Resolve an API path (e.g. `/api/tokens`) to the full backend URL. */
export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  // Browser: same-origin `/api/*` is proxied to the Express API (see next.config rewrites).
  if (typeof window !== "undefined") {
    return path;
  }
  return `${API_URL}${path}`;
}

/** User-friendly message when fetch() fails before a response (network / CORS). */
export function formatFetchError(error: unknown, context = "Request"): string {
  if (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) {
    return `${context} failed — could not reach the API. Check your connection or try again shortly.`;
  }
  return error instanceof Error ? error.message : `${context} failed`;
}

/** Parse API JSON even when upstream returns plain-text errors (e.g. proxy 500). */
export async function readApiJson<T = Record<string, unknown>>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as T;
    const err =
      !res.ok && typeof data === "object" && data && "error" in data
        ? String((data as { error?: unknown }).error ?? "")
        : undefined;
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: err || (!res.ok ? `Request failed (${res.status})` : undefined),
    };
  } catch {
    const snippet = text.trim().slice(0, 160);
    return {
      ok: false,
      status: res.status,
      data: {} as T,
      error: snippet || `Request failed (${res.status})`,
    };
  }
}

export async function getServerCookieHeader(): Promise<string | undefined> {
  if (typeof window !== "undefined") return undefined;
  const { cookies } = await import("next/headers");
  return cookies().toString();
}

export async function apiClient(
  endpoint: string,
  options?: RequestInit,
  serverCookies?: string
) {
  const isServer = typeof window === "undefined";
  const headers = new Headers(options?.headers);

  if (
    !headers.has("Content-Type") &&
    options?.body &&
    typeof options.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (isServer && serverCookies) {
    headers.set("Cookie", serverCookies);
  }

  const res = await fetch(apiUrl(endpoint), {
    ...options,
    credentials: options?.credentials ?? "include",
    headers,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function apiFetch(
  endpoint: string,
  init?: RequestInit
): Promise<Response> {
  const isServer = typeof window === "undefined";
  const headers = new Headers(init?.headers);

  if (isServer) {
    const cookieHeader = await getServerCookieHeader();
    if (cookieHeader) headers.set("Cookie", cookieHeader);
  }

  return fetch(apiUrl(endpoint), {
    ...init,
    credentials: init?.credentials ?? "include",
    headers,
  });
}
