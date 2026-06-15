"use client";

import { apiUrl } from "@/lib/api";

let csrfToken: string | null = null;

export function setAdminCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getAdminCsrfToken() {
  return csrfToken;
}

export function clearAdminSession() {
  csrfToken = null;
}

export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init?.headers);

  if (method !== "GET" && method !== "HEAD") {
    if (!csrfToken) {
      throw new Error("Admin CSRF token required");
    }
    headers.set("X-CSRF-Token", csrfToken);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  return fetch(apiUrl(url), {
    ...init,
    method,
    headers,
    credentials: "include",
  });
}
