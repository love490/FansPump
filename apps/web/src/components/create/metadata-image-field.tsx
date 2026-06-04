"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Link2, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MetadataImageFieldProps = {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  variant?: "logo" | "banner";
  urlPlaceholder?: string;
};

export function MetadataImageField({
  label,
  hint,
  value,
  onChange,
  variant = "logo",
  urlPlaceholder = "https://example.com/image.png",
}: MetadataImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  const previewClass =
    variant === "banner" ? "relative h-28 w-full overflow-hidden rounded-lg border" : "relative h-20 w-20 overflow-hidden rounded-lg border";

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label>{label}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
              "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center",
              variant === "banner" ? "min-h-[120px]" : "min-h-[100px]"
            )}
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop an image here or choose a file</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF · max 5 MB</p>
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
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={urlPlaceholder}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {value && (
          <div className="flex flex-wrap items-center gap-4">
            <div className={previewClass}>
              <Image src={value} alt={`${label} preview`} fill className="object-cover" unoptimized />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
