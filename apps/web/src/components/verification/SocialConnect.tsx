"use client";

import { apiUrl } from "@/lib/api";
import { useVerification } from "@/hooks/useVerification";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SocialConnectProps = {
  walletAddress: string;
};

export function SocialConnect({ walletAddress }: SocialConnectProps) {
  const { socials, refresh } = useVerification(walletAddress);

  async function disconnect(platform: "x" | "discord") {
    await fetch(apiUrl(`/api/verification/social/${platform}/disconnect`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: walletAddress.toLowerCase() }),
    });
    await refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Social accounts
      </p>
      <p className="text-xs text-muted-foreground">
        Optional. Connected accounts are used to verify social quests from creators.
      </p>

      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          socials.x.connected ? "border-border bg-muted/30" : "border-border bg-card"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.74-8.835L1.254 2.25H8.08l4.265 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">X (Twitter)</p>
          <p className="truncate text-xs text-muted-foreground">
            {socials.x.connected ? `@${socials.x.username}` : "Not connected"}
          </p>
        </div>
        {socials.x.connected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive"
            onClick={() => void disconnect("x")}
          >
            Disconnect
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="shrink-0 text-xs">
            <a href={apiUrl(`/api/verification/social/x/connect?wallet=${walletAddress.toLowerCase()}`)}>
              Connect
            </a>
          </Button>
        )}
      </div>

      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          socials.discord.connected ? "border-border bg-muted/30" : "border-border bg-card"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-950">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-indigo-400">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.032.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Discord</p>
          <p className="truncate text-xs text-muted-foreground">
            {socials.discord.connected ? socials.discord.username : "Not connected"}
          </p>
        </div>
        {socials.discord.connected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive"
            onClick={() => void disconnect("discord")}
          >
            Disconnect
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="shrink-0 text-xs">
            <a
              href={apiUrl(
                `/api/verification/social/discord/connect?wallet=${walletAddress.toLowerCase()}`
              )}
            >
              Connect
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
