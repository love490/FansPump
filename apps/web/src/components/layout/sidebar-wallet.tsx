"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChevronDown, LogOut, User, Wallet } from "lucide-react";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCreatorDisplay } from "@/lib/username";
import { cn, shortenAddress } from "@/lib/utils";

export function SidebarWallet({ collapsed }: { collapsed?: boolean }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { account, isSignedIn, signOut } = useAuth();
  const { profile } = useUserProfile(address);
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
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

  if (!isSignedIn && !isConnected) {
    return (
      <>
        <button
          type="button"
          onClick={() => setSignInOpen(true)}
          className={cn(
            "flex w-full items-center rounded-lg border border-border bg-background py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
            collapsed ? "justify-center px-2" : "gap-2 px-3"
          )}
          title={collapsed ? "Sign in" : undefined}
        >
          <User className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign in</span>}
        </button>
        <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
      </>
    );
  }

  const displayLabel =
    profile?.username?.trim() ||
    account?.displayName ||
    account?.email?.split("@")[0] ||
    (isConnected && address ? formatCreatorDisplay(profile?.username, address, shortenAddress) : "Signed in");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center rounded-lg border border-border bg-muted/50 py-2 text-sm font-medium transition-colors hover:bg-muted",
          collapsed ? "justify-center px-2" : "gap-2 px-3"
        )}
        title={collapsed ? displayLabel : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Wallet className="h-4 w-4 shrink-0 text-primary" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-xs">{displayLabel}</span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-[120] rounded-lg border border-border bg-popover p-1 shadow-lg",
            collapsed ? "left-full top-0 ml-2 min-w-[11rem]" : "bottom-full left-0 right-0 mb-2"
          )}
        >
          {isSignedIn && account?.email && (
            <p className="break-all px-3 py-2 text-xs text-muted-foreground">{account.email}</p>
          )}
          {isConnected && address && (
            <p className="break-all px-3 py-1 font-mono text-xs text-muted-foreground">{address}</p>
          )}
          {!isConnected && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                openConnectModal?.();
                setOpen(false);
              }}
            >
              <Wallet className="h-4 w-4" />
              Connect wallet
            </button>
          )}
          {isSignedIn && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              onClick={() => {
                void signOut();
                setOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
          {isConnected && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              Disconnect wallet
            </button>
          )}
        </div>
      )}
    </div>
  );
}
