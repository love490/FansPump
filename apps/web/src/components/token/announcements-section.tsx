"use client";

import { apiUrl } from "@/lib/api";

import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ANNOUNCEMENT_TYPES, ANNOUNCEMENT_TYPE_LABELS, type AnnouncementTypeId } from "@iopn/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementTypeId;
  createdAt: string;
  creatorWallet: string;
};

type AnnouncementsSectionProps = {
  tokenAddress: string;
  creatorAddress: string;
};

export function AnnouncementsSection({ tokenAddress, creatorAddress }: AnnouncementsSectionProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<AnnouncementTypeId>("GENERAL");
  const [posting, setPosting] = useState(false);

  const isCreator = address?.toLowerCase() === creatorAddress.toLowerCase();

  function load() {
    setLoading(true);
    fetch(apiUrl(`/api/announcements?tokenAddress=${tokenAddress}`))
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [tokenAddress]);

  async function postAnnouncement() {
    if (!address || !title.trim() || !content.trim()) return;
    setPosting(true);
    try {
      const prefix = process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
      const message = `${prefix}\nPost announcement for ${tokenAddress}\n${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch(apiUrl("/api/announcements"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddress,
          creatorWallet: address,
          title: title.trim(),
          content: content.trim(),
          type,
          message,
          signature,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to post");
      }

      setTitle("");
      setContent("");
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Announcements
        </CardTitle>
        {isCreator && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New announcement"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && isCreator && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <Label>Type</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as AnnouncementTypeId)}
              >
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ANNOUNCEMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Content</Label>
              <textarea
                className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={5000}
              />
            </div>
            <Button onClick={postAnnouncement} disabled={posting}>
              {posting ? "Posting..." : "Publish"}
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <article key={a.id} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <Badge variant="secondary">{ANNOUNCEMENT_TYPE_LABELS[a.type]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
