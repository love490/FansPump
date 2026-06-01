"use client";

const SESSION_KEY = "iopn_admin_session";

export interface AdminSession {
  walletAddress: string;
  signature: string;
  message: string;
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function setAdminSession(session: AdminSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const session = getAdminSession();
  if (!session) {
    throw new Error("Admin session required");
  }

  const method = init?.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init?.headers);

  if (method === "GET") {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("walletAddress", session.walletAddress);
    u.searchParams.set("signature", session.signature);
    u.searchParams.set("message", session.message);
    return fetch(u.toString(), { ...init, method: "GET", headers: init?.headers });
  }

  headers.set("Content-Type", "application/json");
  const body =
    init?.body && typeof init.body === "string"
      ? { ...JSON.parse(init.body), ...session }
      : { ...session, ...(init?.body ? JSON.parse(init.body as string) : {}) };

  return fetch(url, { ...init, method, headers, body: JSON.stringify(body) });
}
