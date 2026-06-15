"use client";

import { apiUrl } from "@/lib/api";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FollowCreatorButtonProps = {
  creatorWallet: string;
  className?: string;
  size?: "sm" | "default";
};

export function FollowCreatorButton({ creatorWallet, className, size = "sm" }: FollowCreatorButtonProps) {
  const { address, isConnected } = useAccount();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const creator = creatorWallet.toLowerCase();
  const viewer = address?.toLowerCase();
  const isSelf = Boolean(viewer && viewer === creator);

  const refresh = useCallback(() => {
    if (!viewer || isSelf) {
      setFollowing(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(apiUrl(`/api/user/follows?wallet=${viewer}&creator=${creator}`))
      .then((r) => r.json())
      .then((data) => setFollowing(Boolean(data.following)))
      .catch(() => setFollowing(false))
      .finally(() => setLoading(false));
  }, [viewer, creator, isSelf]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleFollow() {
    if (!viewer || isSelf || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/user/follows"), {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: viewer,
          creatorWallet: creator,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Follow failed");
      setFollowing(!following);
    } catch {
      refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected || isSelf) return null;

  return (
    <Button
      type="button"
      variant={following ? "outline" : "default"}
      size={size}
      className={cn(className)}
      disabled={loading || busy}
      onClick={() => void toggleFollow()}
    >
      {following ? (
        <>
          <UserMinus className="mr-1.5 h-4 w-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}
