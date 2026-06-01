"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { LogOut, Wallet } from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";

export function SidebarWallet({ collapsed }: { collapsed?: boolean }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [collapsed]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!isConnected || !address) {
    return (
      <button
        type="button"
        onClick={openConnectModal}
        className={cn(
          "flex w-full items-center rounded-lg border border-border bg-background py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
          collapsed ? "justify-center px-2" : "gap-2 px-3"
        )}
        title={collapsed ? "Connect wallet" : undefined}
      >
        <Wallet className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Connect Wallet</span>}
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center rounded-lg border border-border bg-muted/50 py-2 text-sm font-medium transition-colors hover:bg-muted",
          collapsed ? "justify-center px-2" : "gap-2 px-3"
        )}
        title={collapsed ? address : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Wallet className="h-4 w-4 shrink-0 text-primary" />
        {!collapsed && (
          <span className="truncate font-mono text-xs">{shortenAddress(address, 4)}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 min-w-[10rem] rounded-lg border border-border bg-popover p-1 shadow-lg",
            collapsed ? "left-full top-0 ml-2" : "bottom-full left-0 mb-2 w-full"
          )}
        >
          <p className="px-3 py-2 font-mono text-xs text-muted-foreground break-all">{address}</p>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
