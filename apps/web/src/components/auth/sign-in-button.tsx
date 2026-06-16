"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChevronDown, LogOut, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { useAccountDisplayLabel } from "@/hooks/useAccountDisplayLabel";
import { cn, shortenAddress } from "@/lib/utils";

type SignInButtonProps = {
  showBalance?: boolean;
  chainStatus?: "icon" | "full" | "none";
  accountStatus?: "address" | "avatar" | "full";
  className?: string;
  size?: "default" | "sm";
};

export function SignInButton({
  className,
  size = "default",
  showBalance = false,
  accountStatus = "address",
}: SignInButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { isSignedIn, isLoading, signOut } = useAuth();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { primaryLabel, socialName, balanceLabel, walletAddress, account, avatarUrl } =
    useAccountDisplayLabel({ preferBalance: showBalance });

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  if (isLoading) {
    return (
      <Button variant="outline" size={size} className={cn("min-w-[5.5rem]", className)} disabled>
        …
      </Button>
    );
  }

  if (!isSignedIn && !isConnected) {
    return (
      <>
        <Button
          size={size}
          className={cn("gap-2", className)}
          onClick={() => setModalOpen(true)}
        >
          <User className="h-4 w-4" />
          Sign in
        </Button>
        <SignInModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  const showAvatar = accountStatus === "avatar" || accountStatus === "full" || Boolean(avatarUrl);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="outline"
        size={size}
        className={cn("gap-2 pl-2 pr-2", className)}
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        {showAvatar && avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <User className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="max-w-[8rem] truncate text-sm tabular-nums">{primaryLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60", menuOpen && "rotate-180")} />
      </Button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[120] mt-2 min-w-[12rem] rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {socialName && balanceLabel && showBalance && (
            <p className="px-3 py-2 text-sm font-medium tabular-nums">{balanceLabel}</p>
          )}
          {isSignedIn && account?.email && (
            <p className="break-all px-3 py-2 text-xs text-muted-foreground">{account.email}</p>
          )}
          {isConnected && walletAddress ? (
            <p className="break-all px-3 py-1 font-mono text-xs text-muted-foreground">
              {shortenAddress(walletAddress, 6)}
            </p>
          ) : (
            !isSignedIn && <p className="px-3 py-2 text-xs text-amber-600">Wallet not connected</p>
          )}

          {!isConnected && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                setMenuOpen(false);
                openConnectModal?.();
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
                setMenuOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}

          {!isSignedIn && isConnected && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
            >
              <User className="h-4 w-4" />
              Link account
            </button>
          )}

          {isConnected && (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              Disconnect wallet
            </button>
          )}
        </div>
      )}

      <SignInModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
