"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M followers`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K followers`;
  return `${count} follower${count === 1 ? "" : "s"}`;
}

function formatCreatedAgo(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.max(0, Math.floor(ms / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || url;
  } catch {
    return url;
  }
}

type TokenAboutCardProps = {
  creatorFollowers?: number;
  website?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  createdAt?: string | null;
};

export function TokenAboutCard({
  creatorFollowers = 0,
  website,
  telegram,
  twitter,
  createdAt,
}: TokenAboutCardProps) {
  const rows: { label: string; content: React.ReactNode }[] = [];

  rows.push({
    label: "Community",
    content: <span className="text-foreground">{formatFollowers(creatorFollowers)}</span>,
  });

  if (website) {
    rows.push({
      label: "Website",
      content: (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {linkLabel(website)}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ),
    });
  }

  if (telegram) {
    const href = telegram.startsWith("http") ? telegram : `https://t.me/${telegram.replace(/^@/, "")}`;
    rows.push({
      label: "Telegram",
      content: (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {telegram.replace(/^https?:\/\/(t\.me\/)?/, "")}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ),
    });
  }

  if (twitter) {
    const href = twitter.startsWith("http")
      ? twitter
      : `https://x.com/${twitter.replace(/^@/, "")}`;
    rows.push({
      label: "X",
      content: (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {twitter.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, "@")}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ),
    });
  }

  if (createdAt) {
    rows.push({
      label: "Created",
      content: <span className="text-foreground">{formatCreatedAgo(createdAt)}</span>,
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">About this Project</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-muted-foreground">{row.label}</dt>
              <dd className="text-sm">{row.content}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
