"use client";

import { apiUrl } from "@/lib/api";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  adminFetch,
  clearAdminSession,
  setAdminCsrfToken,
} from "@/lib/admin-session";
import type { AdminPermission, AdminRole } from "@/lib/admin/types";

type AdminContextValue = {
  email: string | null;
  authorized: boolean;
  requires2FA: boolean;
  sessionChecking: boolean;
  role: AdminRole | null;
  permissions: AdminPermission[];
  twoFactorEnabled: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<"ok" | "2fa" | "failed">;
  verify2FA: (code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  can: (perm: AdminPermission) => boolean;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const refreshId = ++refreshIdRef.current;
    setSessionChecking(true);

    try {
      const res = await fetch(apiUrl("/api/admin/auth/me"), { credentials: "include" });
      if (refreshId !== refreshIdRef.current) return;

      if (res.ok) {
        const d = await res.json();
        if (d.requires2FA) {
          setRequires2FA(true);
          setAuthorized(false);
          setEmail(d.email ?? null);
          setRole(null);
          setPermissions([]);
          setAdminCsrfToken(null);
        } else if (d.authorized) {
          setRequires2FA(false);
          setAuthorized(true);
          setEmail(d.email);
          setRole(d.role);
          setPermissions(d.permissions ?? []);
          setTwoFactorEnabled(Boolean(d.twoFactorEnabled));
          setAdminCsrfToken(d.csrfToken ?? null);
        } else {
          clearAdminSession();
          setAuthorized(false);
          setRequires2FA(false);
          setEmail(null);
          setRole(null);
          setPermissions([]);
        }
      } else {
        clearAdminSession();
        setAuthorized(false);
        setRequires2FA(false);
        setEmail(null);
        setRole(null);
        setPermissions([]);
      }
    } catch {
      if (refreshId === refreshIdRef.current) {
        setAuthorized(false);
      }
    } finally {
      if (refreshId === refreshIdRef.current) {
        setSessionChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (loginEmail: string, password: string): Promise<"ok" | "2fa" | "failed"> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl("/api/admin/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: loginEmail, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Sign-in failed.");
          return "failed";
        }

        if (data.requires2FA) {
          setRequires2FA(true);
          setEmail(data.email ?? loginEmail);
          return "2fa";
        }

        await refresh();
        router.push("/admin/dashboard");
        return "ok";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed.");
        return "failed";
      } finally {
        setLoading(false);
      }
    },
    [router, refresh]
  );

  const verify2FA = useCallback(
    async (code: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl("/api/admin/auth/verify-2fa"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Invalid code.");
          return false;
        }

        setAdminCsrfToken(data.csrfToken ?? null);
        await refresh();
        router.push("/admin/dashboard");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verification failed.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [router, refresh]
  );

  const signOut = useCallback(async () => {
    try {
      await fetch(apiUrl("/api/admin/auth/logout"), { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    clearAdminSession();
    setAuthorized(false);
    setRequires2FA(false);
    setEmail(null);
    setRole(null);
    setPermissions([]);
    setError(null);
    router.push("/admin/login");
  }, [router]);

  const can = useCallback(
    (perm: AdminPermission) => permissions.includes(perm),
    [permissions]
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AdminContext.Provider
      value={{
        email,
        authorized,
        requires2FA,
        sessionChecking,
        role,
        permissions,
        twoFactorEnabled,
        loading,
        error,
        login,
        verify2FA,
        signOut,
        can,
        refresh,
        clearError,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
