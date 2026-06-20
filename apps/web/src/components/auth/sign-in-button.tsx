"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { isSignedIn, isLoading, signOut } = useAuth();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { primaryLabel, identityLabel, balanceSummary, walletAddress, account, avatarUrl } =
    useAccountDisplayLabel({ preferBalance: showBalance });

  useLayoutEffect(() => {
    if (!menuOpen || !rootRef.current) {
      setMenuPos(null);
      return;
    }
    function updatePosition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById("sign-in-account-menu");
      if (menu?.contains(target)) return;
      setMenuOpen(false);
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
        <span className="min-w-0 flex-1 text-left">
          {showBalance && balanceSummary ? (
            <>
              <span className="block max-w-[9rem] truncate text-sm leading-tight">{identityLabel}</span>
              <span className="block max-w-[9rem] truncate text-[11px] tabular-nums leading-tight text-muted-foreground">
                {balanceSummary}
              </span>
            </>
          ) : (
            <span className="block max-w-[8rem] truncate text-sm tabular-nums">{primaryLabel}</span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60", menuOpen && "rotate-180")} />
      </Button>

      {menuOpen &&
        menuPos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9998] cursor-default bg-black/25 backdrop-blur-[1px]"
              aria-label="Close account menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id="sign-in-account-menu"
              role="menu"
              style={{ top: menuPos.top, right: menuPos.right }}
              className="fixed z-[9999] min-w-[14rem] overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
            >
              <div className="border-b border-border bg-muted/40 px-3 py-2.5">
                {balanceSummary && showBalance && (
                  <p className="text-sm font-semibold tabular-nums">{balanceSummary}</p>
                )}
                {isSignedIn && account?.email && (
                  <p className="mt-0.5 break-all text-xs text-muted-foreground">{account.email}</p>
                )}
                {walletAddress ? (
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {shortenAddress(walletAddress, 6)}
                  </p>
                ) : (
                  !isSignedIn &&
                  !isConnected && <p className="text-xs text-amber-600">Wallet not connected</p>
                )}
              </div>
              <div className="p-1">
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
                      router.push("/settings#linked-accounts");
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
            </div>
          </>,
          document.body
        )}

      <SignInModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
