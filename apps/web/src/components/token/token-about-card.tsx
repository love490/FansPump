"use client";

import { ExternalLink, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEVELOPMENT_STAGE_LABELS,
  type DevelopmentStageId,
} from "@iopn/shared";

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

function socialHref(kind: "telegram" | "twitter", value: string): string {
  if (value.startsWith("http")) return value;
  if (kind === "telegram") return `https://t.me/${value.replace(/^@/, "")}`;
  return `https://x.com/${value.replace(/^@/, "")}`;
}

type TokenAboutCardProps = {
  creatorFollowers?: number;
  developmentStage?: DevelopmentStageId | null;
  website?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  discord?: string | null;
  github?: string | null;
  medium?: string | null;
  documentation?: string | null;
  whitepaper?: string | null;
  supportEmail?: string | null;
  announcementChannel?: string | null;
  communityInviteLink?: string | null;
  officialContact?: string | null;
  createdAt?: string | null;
};

export function TokenAboutCard({
  creatorFollowers = 0,
  developmentStage,
  website,
  telegram,
  twitter,
  discord,
  github,
  medium,
  documentation,
  whitepaper,
  supportEmail,
  announcementChannel,
  communityInviteLink,
  officialContact,
  createdAt,
}: TokenAboutCardProps) {
  const rows: { label: string; content: React.ReactNode }[] = [];

  rows.push({
    label: "Community",
    content: <span className="text-foreground">{formatFollowers(creatorFollowers)}</span>,
  });

  if (developmentStage) {
    rows.push({
      label: "Stage",
      content: (
        <span className="text-foreground">{DEVELOPMENT_STAGE_LABELS[developmentStage]}</span>
      ),
    });
  }

  const linkRows: { label: string; href: string; text?: string }[] = [];
  if (website) linkRows.push({ label: "Website", href: website });
  if (telegram) linkRows.push({ label: "Telegram", href: socialHref("telegram", telegram), text: telegram });
  if (twitter) linkRows.push({ label: "X", href: socialHref("twitter", twitter), text: twitter });
  if (discord) linkRows.push({ label: "Discord", href: discord.startsWith("http") ? discord : `https://discord.gg/${discord}` });
  if (github) linkRows.push({ label: "GitHub", href: github });
  if (medium) linkRows.push({ label: "Medium", href: medium });
  if (documentation) linkRows.push({ label: "Docs", href: documentation });
  if (whitepaper) linkRows.push({ label: "Whitepaper", href: whitepaper });
  if (communityInviteLink) linkRows.push({ label: "Community", href: communityInviteLink });

  for (const row of linkRows) {
    rows.push({
      label: row.label,
      content: (
        <a
          href={row.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {row.text ? row.text.replace(/^https?:\/\//, "") : linkLabel(row.href)}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ),
    });
  }

  if (supportEmail) {
    rows.push({
      label: "Support",
      content: (
        <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          <Mail className="h-3 w-3" /> {supportEmail}
        </a>
      ),
    });
  }

  if (announcementChannel) {
    rows.push({
      label: "Announcements",
      content: <span className="text-foreground">{announcementChannel}</span>,
    });
  }

  if (officialContact) {
    rows.push({
      label: "Contact",
      content: <span className="text-foreground">{officialContact}</span>,
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
