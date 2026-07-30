"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddressCopyButton } from "@/components/ui/address-copy-button";
import { opnChainConfig } from "@/lib/chain-config/opn";
import { shortenAddress } from "@/lib/utils";

type ReceiveTokenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string | undefined;
  symbol?: string;
};

export function ReceiveTokenDialog({
  open,
  onOpenChange,
  walletAddress,
  symbol,
}: ReceiveTokenDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !walletAddress) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(walletAddress, {
      width: 220,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, walletAddress]);

  async function shareAddress() {
    if (!walletAddress) return;
    setShareError(null);
    const text = symbol
      ? `Send ${symbol} to my OPN Chain wallet:\n${walletAddress}`
      : `My OPN Chain wallet:\n${walletAddress}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Receive on FansPump", text });
        return;
      }
      await navigator.clipboard.writeText(walletAddress);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setShareError("Could not share. Address copied if clipboard is available.");
      try {
        await navigator.clipboard.writeText(walletAddress);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive {symbol ?? "tokens"}</DialogTitle>
          <DialogDescription>
            Share this address to receive assets on {opnChainConfig.name}.
          </DialogDescription>
        </DialogHeader>

        {!walletAddress ? (
          <p className="text-sm text-muted-foreground">Connect a wallet to receive tokens.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${shortenAddress(walletAddress, 6)}`}
                  className="rounded-xl border border-border bg-white p-2"
                  width={220}
                  height={220}
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  Generating QR…
                </div>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Network · {opnChainConfig.name}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="min-w-0 flex-1 break-all font-mono text-xs">{walletAddress}</p>
              <AddressCopyButton value={walletAddress} />
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={() => void shareAddress()}>
              <Share2 className="mr-1.5 h-4 w-4" />
              Share address
            </Button>
            {shareError && <p className="text-xs text-muted-foreground">{shareError}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
