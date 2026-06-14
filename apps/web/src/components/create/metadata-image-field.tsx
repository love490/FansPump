"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BANNER_UPLOAD, LOGO_UPLOAD } from "@/lib/token-images/constants";
import {
  readImageDimensions,
  validateBannerDimensions,
  validateLogoDimensions,
  type ImageDimensions,
} from "@/lib/token-images/validate";
import { TokenBanner } from "@/components/tokens/token-banner";
import { TokenLogo } from "@/components/tokens/token-logo";

type MetadataImageFieldProps = {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  variant?: "logo" | "banner";
  urlPlaceholder?: string;
  symbol?: string;
};

export function MetadataImageField({
  label,
  hint,
  value,
  onChange,
  variant = "logo",
  urlPlaceholder = "https://example.com/image.png",
  symbol = "TK",
}: MetadataImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const specHint =
    variant === "logo"
      ? `Recommended square 1:1 · ${LOGO_UPLOAD.recommendedPx}×${LOGO_UPLOAD.recommendedPx} px (any image accepted)`
      : `Recommended 3:1 wide · ${BANNER_UPLOAD.recommendedWidth}×${BANNER_UPLOAD.recommendedHeight} px (any image accepted)`;

  async function uploadFile(file: File, recommendation?: string | null) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", variant);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (!data.url) {
        setError("Image storage is not configured yet. Paste an external image URL instead.");
        setMode("url");
        return;
      }
      onChange(data.url);
      setMode("upload");
      setWarning(recommendation ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSelectedFile(file: File) {
    setError(null);
    setWarning(null);

    let dimensions: ImageDimensions;
    try {
      dimensions = await readImageDimensions(file);
    } catch {
      setError("Could not read image dimensions.");
      return;
    }

    if (variant === "logo") {
      const logoCheck = validateLogoDimensions(dimensions);
      await uploadFile(file, logoCheck.warning);
      return;
    }

    const bannerCheck = validateBannerDimensions(dimensions);
    await uploadFile(file, bannerCheck.warning);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleSelectedFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleSelectedFile(file);
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label>{label}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{specHint}</p>
        </div>
        <div className="flex rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            URL
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {mode === "upload" ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center transition-colors",
              variant === "banner" ? "min-h-[120px]" : "min-h-[100px]",
              dragOver && "border-primary bg-primary/5"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop an image here or choose a file</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF · max 12 MB</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Choose file"
              )}
            </Button>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
          </div>
        ) : (
          <Input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder={urlPlaceholder} />
        )}

        {warning && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Recommended: {warning}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {value && (
          <div className="flex flex-wrap items-center gap-4">
            {variant === "banner" ? (
              <div className="w-full max-w-md">
                <TokenBanner src={value} showFallback={false} priority />
              </div>
            ) : (
              <TokenLogo src={value} symbol={symbol} layout="fixed" size={72} />
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(""); setWarning(null); }}>
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
