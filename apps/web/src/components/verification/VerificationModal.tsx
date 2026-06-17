"use client";

import { VerificationFlow } from "./VerificationFlow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type VerificationModalProps = {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
};

export function VerificationModal({ walletAddress, isOpen, onClose }: VerificationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account &amp; Socials</DialogTitle>
        </DialogHeader>
        <VerificationFlow walletAddress={walletAddress} onComplete={onClose} />
      </DialogContent>
    </Dialog>
  );
}
