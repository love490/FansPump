"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ScanInput({
  onScan,
  isLoading,
  standalone = false,
}: {
  onScan: (address: string) => void;
  isLoading: boolean;
  standalone?: boolean;
}) {
  const [address, setAddress] = useState("");

  function submit() {
    const trimmed = address.trim();
    if (trimmed) onScan(trimmed);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
              standalone ? "text-zinc-500" : "text-muted-foreground"
            )}
          />
          <Input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Paste an OPN Chain address"
            className={cn(
              "pl-9 text-sm font-normal placeholder:text-xs placeholder:font-normal placeholder:text-muted-foreground/50",
              standalone &&
                "border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-600"
            )}
            disabled={isLoading}
          />
        </div>
        <Button
          type="button"
          onClick={submit}
          disabled={!address.trim() || isLoading}
          className={cn("shrink-0", standalone && "bg-white text-zinc-950 hover:bg-zinc-100")}
          variant={standalone ? "default" : "default"}
        >
          {isLoading ? "Scanning…" : "TrustScan"}
        </Button>
      </div>
      <p
        className={cn(
          "text-center text-xs",
          standalone ? "text-zinc-600" : "text-muted-foreground"
        )}
      >
        OPN Chain · Paste a token contract or deployer wallet
      </p>
    </div>
  );
}
