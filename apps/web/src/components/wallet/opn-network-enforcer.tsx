"use client";

import { useEnsureOpnNetwork } from "@/hooks/useEnsureOpnNetwork";

/** Keeps connected wallets on OPN Chain across the app. */
export function OpnNetworkEnforcer() {
  useEnsureOpnNetwork();
  return null;
}
