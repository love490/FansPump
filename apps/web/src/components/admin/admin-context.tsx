"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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
  role: AdminRole | null;
  permissions: AdminPermission[];
  loading: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => void;
  can: (perm: AdminPermission) => boolean;
  refresh: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) return;
    const session = getAdminSession();
    if (!session || session.walletAddress.toLowerCase() !== address.toLowerCase()) {
      setAuthorized(false);
      setRole(null);
      setPermissions([]);
      return;
    }
    try {
      const res = await adminFetch("/api/admin/me");
      if (res.ok) {
        const d = await res.json();
        setAuthorized(true);
        setRole(d.role);
        setPermissions(d.permissions ?? []);
      } else {
        clearAdminSession();
        setAuthorized(false);
      }
    } catch {
      setAuthorized(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      setIsAdmin(false);
      setAuthorized(false);
      return;
    }
    fetch(`/api/admin/check?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin));
    refresh();
  }, [address, refresh]);

  const signIn = useCallback(async () => {
    if (!address) return false;
    setLoading(true);
    try {
      const message = buildAdminAuthMessage(address);
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/admin/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, signature, message }),
      });
      if (!res.ok) return false;
      const d = await res.json();
      setAdminSession({ walletAddress: address, signature, message });
      setAuthorized(true);
      setRole(d.role);
      setPermissions(d.permissions ?? []);
      router.push("/admin/dashboard");
      return true;
    } finally {
      setLoading(false);
    }
  }, [address, signMessageAsync, router]);

  const signOut = useCallback(() => {
    clearAdminSession();
    setAuthorized(false);
    setRole(null);
    setPermissions([]);
    router.push("/admin/login");
  }, [router]);

  const can = useCallback(
    (perm: AdminPermission) => permissions.includes(perm),
    [permissions]
  );

  return (
    <AdminContext.Provider
      value={{
        address,
        isAdmin,
        authorized: authorized && isConnected,
        role,
        permissions,
        loading,
        signIn,
        signOut,
        can,
        refresh,
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
