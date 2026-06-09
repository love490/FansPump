"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useRouter } from "next/navigation";
import {
  adminFetch,
  clearAdminSession,
  getAdminSession,
  setAdminSession,
} from "@/lib/admin-session";
import { buildAdminAuthMessage } from "@/lib/admin-auth";
import type { AdminPermission, AdminRole } from "@/lib/admin/types";

type AdminContextValue = {
  address: string | undefined;
  isAdmin: boolean;
  authorized: boolean;
  sessionChecking: boolean;
  role: AdminRole | null;
  permissions: AdminPermission[];
  loading: boolean;
  error: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => void;
  can: (perm: AdminPermission) => boolean;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!address) {
      setAuthorized(false);
      setRole(null);
      setPermissions([]);
      setSessionChecking(false);
      return;
    }

    const refreshId = ++refreshIdRef.current;
    setSessionChecking(true);

    const session = getAdminSession();
    if (!session || session.walletAddress.toLowerCase() !== address.toLowerCase()) {
      if (refreshId === refreshIdRef.current) {
        setAuthorized(false);
        setRole(null);
        setPermissions([]);
        setSessionChecking(false);
      }
      return;
    }

    try {
      const res = await adminFetch("/api/admin/me");
      if (refreshId !== refreshIdRef.current) return;

      if (res.ok) {
        const d = await res.json();
        setAuthorized(true);
        setRole(d.role);
        setPermissions(d.permissions ?? []);
      } else {
        const d = await res.json().catch(() => ({}));
        clearAdminSession();
        setAuthorized(false);
        setRole(null);
        setPermissions([]);
        if (d.error) setError(String(d.error));
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
  }, [address]);

  useEffect(() => {
    if (!address) {
      setIsAdmin(false);
      setAuthorized(false);
      setSessionChecking(false);
      return;
    }

    setSessionChecking(true);
    fetch(`/api/admin/check?wallet=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d) => setIsAdmin(Boolean(d.isAdmin)))
      .catch(() => setIsAdmin(false));

    void refresh();
  }, [address, refresh]);

  const signIn = useCallback(async () => {
    if (!address) return false;
    setLoading(true);
    setError(null);
    try {
      const checkRes = await fetch(`/api/admin/check?wallet=${encodeURIComponent(address)}`);
      const checkData = await checkRes.json();
      if (!checkData.isAdmin) {
        setError("This wallet is not in the admin allowlist.");
        return false;
      }

      const message = buildAdminAuthMessage(address, checkData.messagePrefix);
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/admin/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, signature, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Sign-in failed.");
        return false;
      }

      setAdminSession({ walletAddress: address, signature, message });
      await refresh();
      router.push("/admin/dashboard");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [address, signMessageAsync, router, refresh]);

  const signOut = useCallback(() => {
    clearAdminSession();
    setAuthorized(false);
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
        address,
        isAdmin,
        authorized,
        sessionChecking,
        role,
        permissions,
        loading,
        error,
        signIn,
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
