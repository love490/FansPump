"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoverFilters } from "@/lib/tokens-api";
import {
  discoverMoreSections,
  discoverPopularSections,
  type DiscoverBrowseSectionId,
} from "@/lib/discover-sections";
import { TOKEN_CATEGORIES, TOKEN_CATEGORY_LABELS, type TokenCategoryId } from "@iopn/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type DiscoverFilterPanelProps = {
  activeSection: DiscoverBrowseSectionId;
  filters: DiscoverFilters;
  onSelectSection: (sectionId: DiscoverBrowseSectionId) => void;
  onToggle: (key: keyof DiscoverFilters, value?: string) => void;
  onClearFilters: () => void;
  onResetAll: () => void;
  onClose: () => void;
};

function countActiveFilters(filters: DiscoverFilters): number {
  return (
    (filters.category ? 1 : 0) +
    (filters.verified ? 1 : 0) +
    (filters.liquidityLocked ? 1 : 0) +
    (filters.ownershipRenounced ? 1 : 0)
  );
}

function SectionGrid({
  sections,
  activeSection,
  onSelect,
}: {
  sections: typeof discoverPopularSections | typeof discoverMoreSections;
  activeSection: DiscoverBrowseSectionId;
  onSelect: (id: DiscoverBrowseSectionId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors sm:text-sm",
            activeSection === section.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted/40 text-foreground hover:bg-muted"
          )}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}

export function DiscoverFilterPanel({
  activeSection,
  filters,
  onSelectSection,
  onToggle,
  onClearFilters,
  onResetAll,
  onClose,
}: DiscoverFilterPanelProps) {
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="flex max-h-[min(75vh,560px)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Filters</p>
          <p className="text-xs text-muted-foreground">Category, verified, new, and more</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close filters</span>
        </Button>
      </div>

      <div className="space-y-5 overflow-y-auto overscroll-contain py-4 pr-1">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Browse by
          </Label>
          <SectionGrid
            sections={discoverPopularSections}
            activeSection={activeSection}
            onSelect={onSelectSection}
          />
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            More
          </Label>
          <SectionGrid
            sections={discoverMoreSections}
            activeSection={activeSection}
            onSelect={onSelectSection}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Category
          </Label>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto overscroll-contain">
            {TOKEN_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onToggle("category", cat)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filters.category === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                {TOKEN_CATEGORY_LABELS[cat as TokenCategoryId]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trust
          </Label>
          <div className="space-y-2.5">
            {(
              [
                ["verified", "Verified creator"],
                ["liquidityLocked", "Liquidity locked"],
                ["ownershipRenounced", "Ownership renounced"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                <Checkbox checked={!!filters[key]} onCheckedChange={() => onToggle(key)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onClearFilters}
          disabled={activeFilterCount === 0}
          className="text-xs text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
        >
          Clear filters
        </button>
        <button type="button" onClick={onResetAll} className="text-xs text-muted-foreground hover:text-foreground">
          Reset all
        </button>
      </div>
    </div>
  );
}

export function countDiscoverFilters(filters: DiscoverFilters): number {
  return countActiveFilters(filters);
}
