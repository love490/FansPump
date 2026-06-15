export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fanspump.xyz";

/** Resolve an API path (e.g. `/api/tokens`) to the full backend URL. */
export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}${path}`;
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
