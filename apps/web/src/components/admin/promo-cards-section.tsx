"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-session";
import { formatAdminApiError } from "@/lib/admin/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type PromoCardDraft = {
  id: string;
  enabled: boolean;
  label: string;
  headline: string;
  subtitle: string;
  href: string;
  sortOrder: number;
  bountyId?: string | null;
};

type BountyOption = {
  id: string;
  title: string;
  status: string;
};

const EMPTY_FORM: Omit<PromoCardDraft, "id" | "sortOrder"> = {
  enabled: true,
  label: "News",
  headline: "",
  subtitle: "",
  href: "",
  bountyId: null,
};

function newCardId(): string {
  return `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PromoCardsSection() {
  const [cards, setCards] = useState<PromoCardDraft[]>([]);
  const [bounties, setBounties] = useState<BountyOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedBountyId, setSelectedBountyId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [promoRes, bountyRes] = await Promise.all([
      adminFetch("/api/admin/settings/promo-cards"),
      adminFetch("/api/admin/bounties"),
    ]);
    const promoData = await promoRes.json();
    const bountyData = await bountyRes.json();
    setCards(promoData.promoCards?.cards ?? []);
    setBounties(
      (bountyData.bounties ?? []).map((b: BountyOption) => ({
        id: b.id,
        title: b.title,
        status: b.status,
      }))
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCards(nextCards: PromoCardDraft[]) {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/settings/promo-cards", {
        method: "PATCH",
        body: JSON.stringify({ cards: nextCards }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatAdminApiError(data, "Save failed"));
      setCards(data.promoCards?.cards ?? nextCards);
      setMessage("Promo cards saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setSelectedBountyId("");
    setEditingId(null);
  }

  function applyBountyToForm(bountyId: string) {
    setSelectedBountyId(bountyId);
    const bounty = bounties.find((b) => b.id === bountyId);
    if (!bounty) return;
    setForm((prev) => ({
      ...prev,
      label: "Quest",
      headline: bounty.title,
      subtitle: "Featured quest on Earn",
      href: `/earn/${bounty.id}`,
      bountyId: bounty.id,
    }));
  }

  function startEdit(card: PromoCardDraft) {
    setEditingId(card.id);
    setForm({
      enabled: card.enabled,
      label: card.label,
      headline: card.headline,
      subtitle: card.subtitle,
      href: card.href,
      bountyId: card.bountyId ?? null,
    });
    setSelectedBountyId(card.bountyId ?? "");
  }

  async function submitCard() {
    if (!form.headline.trim() || !form.href.trim()) {
      setError("Headline and link are required.");
      return;
    }

    const entry: PromoCardDraft = {
      id: editingId ?? newCardId(),
      enabled: form.enabled,
      label: form.label.trim() || "News",
      headline: form.headline.trim(),
      subtitle: form.subtitle.trim(),
      href: form.href.trim(),
      sortOrder: editingId ? (cards.find((c) => c.id === editingId)?.sortOrder ?? cards.length) : cards.length,
      bountyId: form.bountyId ?? null,
    };

    const next = editingId
      ? cards.map((card) => (card.id === editingId ? entry : card))
      : [...cards, entry];

    await saveCards(next);
    resetForm();
  }

  async function removeCard(id: string) {
    if (!confirm("Remove this promo card?")) return;
    await saveCards(cards.filter((card) => card.id !== id));
    if (editingId === id) resetForm();
  }

  async function toggleCard(id: string) {
    await saveCards(
      cards.map((card) => (card.id === id ? { ...card, enabled: !card.enabled } : card))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Explore promo cards</CardTitle>
        <CardDescription>
          Cards shown on the home/explore strip. Add news, featured quests, or custom links. When you save at least one
          card here, it replaces the auto-generated news list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Featured quest (optional)</Label>
            <select
              value={selectedBountyId}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setSelectedBountyId("");
                  setForm((prev) => ({ ...prev, bountyId: null }));
                  return;
                }
                applyBountyToForm(value);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Pick a quest to pre-fill…</option>
              {bounties.map((bounty) => (
                <option key={bounty.id} value={bounty.id}>
                  {bounty.title} ({bounty.status})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="News" />
          </div>
          <div className="space-y-2">
            <Label>Link URL</Label>
            <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} placeholder="/earn/… or https://…" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Headline</Label>
            <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Visible on explore
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={loading} onClick={() => void submitCard()}>
            {editingId ? "Update card" : "Add card"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" disabled={loading} onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2">
          {cards.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No custom cards yet — explore uses the platform banner and token announcements until you add cards here.
            </p>
          )}
          {cards.map((card) => (
            <div key={card.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{card.headline}</p>
                  <Badge variant={card.enabled ? "default" : "secondary"}>
                    {card.enabled ? card.label : "Hidden"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{card.subtitle || "—"}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{card.href}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => startEdit(card)}>
                  Edit
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void toggleCard(card.id)}>
                  {card.enabled ? "Hide" : "Show"}
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={loading} onClick={() => void removeCard(card.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
