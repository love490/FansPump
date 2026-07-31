"use client";

import { apiUrl } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import {
  ANNOUNCEMENT_TYPES,
  ANNOUNCEMENT_TYPE_LABELS,
  DEVELOPMENT_STAGE_LABELS,
  DEVELOPMENT_STAGES,
  ROADMAP_STATUS_LABELS,
  ROADMAP_STATUSES,
  TOKEN_CATEGORIES,
  TOKEN_CATEGORY_LABELS,
  type AnnouncementTypeId,
  type RoadmapMilestone,
  type RoadmapStatusId,
} from "@iopn/shared";
import { MetadataImageField } from "@/components/create/metadata-image-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  emptyProjectProfileForm,
  profileFormFromToken,
  type ProjectProfileFormState,
} from "@/lib/project/profile-edit";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

function newMilestone(): RoadmapMilestone {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    status: "PLANNED",
  };
}

export function ProjectProfileEditForm() {
  const params = useParams();
  const router = useRouter();
  const tokenAddress = (params.tokenAddress as string)?.toLowerCase();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [creatorAddress, setCreatorAddress] = useState("");
  const [form, setForm] = useState<ProjectProfileFormState>(emptyProjectProfileForm());

  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<AnnouncementTypeId>("GENERAL");
  const [annImageUrl, setAnnImageUrl] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);

  const isCreator = Boolean(
    address && creatorAddress && address.toLowerCase() === creatorAddress.toLowerCase()
  );

  const loadToken = useCallback(async () => {
    if (!tokenAddress) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/tokens/${tokenAddress}`));
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error ?? "Token not found");
      setTokenName(data.token.name);
      setTokenSymbol(data.token.symbol);
      setCreatorAddress(data.token.creatorAddress ?? "");
      setForm(profileFormFromToken(data.token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  function updateField<K extends keyof ProjectProfileFormState>(key: K, value: ProjectProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    if (!address || !tokenAddress) {
      openConnectModal?.();
      return;
    }
    if (!isCreator) {
      setError("Only the project creator wallet can edit this profile.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const prefix =
        process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
      const message = `${prefix}\nUpdate project profile ${tokenAddress}\n${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const payload = {
        ...form,
        developmentStage: form.developmentStage || null,
        roadmap: form.roadmap.length > 0 ? form.roadmap : null,
        walletAddress: address,
        message,
        signature,
      };

      const res = await fetch(apiUrl(`/api/tokens/${tokenAddress}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed");

      setSuccess("Project profile saved.");
      setForm(profileFormFromToken(data.token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function postAnnouncement() {
    if (!address || !tokenAddress || !annTitle.trim() || !annContent.trim()) return;
    setPostingAnn(true);
    setError(null);
    try {
      const prefix =
        process.env.NEXT_PUBLIC_CREATOR_ACTION_MESSAGE_PREFIX ?? "FansPump Creator Action";
      const message = `${prefix}\nPost announcement for ${tokenAddress}\n${Date.now()}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch(apiUrl("/api/announcements"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddress,
          title: annTitle.trim(),
          content: annContent.trim(),
          type: annType,
          imageUrl: annImageUrl.trim() || null,
          walletAddress: address,
          message,
          signature,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to post announcement");

      setAnnTitle("");
      setAnnContent("");
      setAnnImageUrl("");
      setSuccess("Announcement published.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post announcement");
    } finally {
      setPostingAnn(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading project…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/token/${tokenAddress}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to project
          </Link>
        </Button>
      </div>

      <header>
        <h1 className="text-2xl font-bold">Edit Project Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tokenName} ({tokenSymbol}) · Off-chain metadata only — smart contract settings stay
          immutable.
        </p>
      </header>

      {error && (
        <DismissibleAlert variant="error" onDismiss={() => setError(null)}>
          {error}
        </DismissibleAlert>
      )}
      {success && (
        <DismissibleAlert variant="success" onDismiss={() => setSuccess(null)}>
          {success}
        </DismissibleAlert>
      )}

      {!isConnected && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              Connect the creator wallet to edit this project profile.
            </p>
            <Button type="button" onClick={() => openConnectModal?.()}>
              Connect wallet
            </Button>
          </CardContent>
        </Card>
      )}

      {isConnected && !isCreator && (
        <DismissibleAlert variant="error" onDismiss={() => undefined}>
          Connected wallet is not the verified creator for this token.
        </DismissibleAlert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Logo, banner, tagline, and optional theme accent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <MetadataImageField
            label="Project logo"
            hint="Square logo shown on cards and the project page."
            value={form.logoUrl}
            onChange={(logoUrl) => updateField("logoUrl", logoUrl)}
            variant="logo"
            symbol={tokenSymbol || "TK"}
          />
          <MetadataImageField
            label="Cover banner"
            hint="Wide banner for your public project page."
            value={form.bannerUrl}
            onChange={(bannerUrl) => updateField("bannerUrl", bannerUrl)}
            variant="banner"
          />
          <div className="sm:col-span-2">
            <Label>Project tagline</Label>
            <Input
              value={form.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
              maxLength={160}
              placeholder="One-line pitch for your project"
            />
          </div>
          <div>
            <Label>Theme color (optional)</Label>
            <Input
              value={form.themeColor}
              onChange={(e) => updateField("themeColor", e.target.value)}
              placeholder="#2563eb"
              maxLength={7}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About project</CardTitle>
          <CardDescription>
            Display name is FansPump-only — on-chain token name ({tokenName}) cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Display name</Label>
            <Input
              value={form.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
              maxLength={80}
              placeholder={tokenName}
            />
          </div>
          <div>
            <Label>Short summary</Label>
            <Input
              value={form.summary}
              onChange={(e) => updateField("summary", e.target.value)}
              maxLength={500}
              placeholder="Brief summary for listings"
            />
          </div>
          <div>
            <Label>Project description</Label>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              maxLength={5000}
            />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value as ProjectProfileFormState["category"])}
            >
              {TOKEN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {TOKEN_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Development stage</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.developmentStage}
              onChange={(e) =>
                updateField("developmentStage", e.target.value as ProjectProfileFormState["developmentStage"])
              }
            >
              <option value="">Not set</option>
              {DEVELOPMENT_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {DEVELOPMENT_STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["website", "Website", "https://yourproject.com"],
              ["twitter", "X (Twitter)", "https://x.com/yourhandle"],
              ["telegram", "Telegram", "https://t.me/yourchannel"],
              ["discord", "Discord", "https://discord.gg/invite"],
              ["github", "GitHub", "https://github.com/org/repo"],
              ["medium", "Medium", "https://medium.com/@you"],
              ["documentation", "Documentation", "https://docs.yourproject.com"],
              ["whitepaper", "Whitepaper", "https://yourproject.com/whitepaper.pdf"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div>
            <Label>Support email</Label>
            <Input
              type="email"
              value={form.supportEmail}
              onChange={(e) => updateField("supportEmail", e.target.value)}
              placeholder="support@yourproject.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Community</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Announcement channel</Label>
            <Input
              value={form.announcementChannel}
              onChange={(e) => updateField("announcementChannel", e.target.value)}
              placeholder="Telegram channel or Discord announcements"
            />
          </div>
          <div>
            <Label>Community invite link</Label>
            <Input
              value={form.communityInviteLink}
              onChange={(e) => updateField("communityInviteLink", e.target.value)}
              placeholder="https://discord.gg/…"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Official contact</Label>
            <Input
              value={form.officialContact}
              onChange={(e) => updateField("officialContact", e.target.value)}
              placeholder="Email, Telegram @handle, or support desk URL"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap</CardTitle>
          <CardDescription>Milestones shown on your public project page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.roadmap.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Milestone {index + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateField(
                      "roadmap",
                      form.roadmap.filter((m) => m.id !== item.id)
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={item.title}
                onChange={(e) => {
                  const next = [...form.roadmap];
                  next[index] = { ...item, title: e.target.value };
                  updateField("roadmap", next);
                }}
                placeholder="Title"
                maxLength={120}
              />
              <textarea
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.description ?? ""}
                onChange={(e) => {
                  const next = [...form.roadmap];
                  next[index] = { ...item, description: e.target.value };
                  updateField("roadmap", next);
                }}
                placeholder="Description"
                maxLength={2000}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.status}
                onChange={(e) => {
                  const next = [...form.roadmap];
                  next[index] = { ...item, status: e.target.value as RoadmapStatusId };
                  updateField("roadmap", next);
                }}
              >
                {ROADMAP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ROADMAP_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateField("roadmap", [...form.roadmap, newMilestone()])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add milestone
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publish announcement</CardTitle>
          <CardDescription>Updates appear on the public project page (newest first).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Type</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={annType}
              onChange={(e) => setAnnType(e.target.value as AnnouncementTypeId)}
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
            <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              maxLength={8000}
            />
          </div>
          <div>
            <Label>Optional image URL</Label>
            <Input
              value={annImageUrl}
              onChange={(e) => setAnnImageUrl(e.target.value)}
              placeholder="https://… or /uploads/projects/…"
            />
          </div>
          <Button type="button" variant="outline" disabled={postingAnn || !isCreator} onClick={() => void postAnnouncement()}>
            {postingAnn ? "Publishing…" : "Publish announcement"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 pb-8">
        <Button type="button" disabled={saving || !isCreator} onClick={() => void saveProfile()}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/token/${tokenAddress}`)}>
          View public page
        </Button>
      </div>
    </div>
  );
}
