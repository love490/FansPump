"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BANNER_UPLOAD } from "@/lib/token-images/constants";
import { centerCrop3x1, cropImageToBlob, type ImageDimensions } from "@/lib/token-images/validate";

type BannerCropDialogProps = {
  file: File;
  dimensions: ImageDimensions;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
};

export function BannerCropDialog({ file, dimensions, onConfirm, onCancel }: BannerCropDialogProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [crop, setCrop] = useState(() => centerCrop3x1(dimensions));
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampCrop = useCallback(
    (next: { x: number; y: number; width: number; height: number }) => {
      const x = Math.max(0, Math.min(next.x, dimensions.width - next.width));
      const y = Math.max(0, Math.min(next.y, dimensions.height - next.height));
      return { ...next, x, y };
    },
    [dimensions.height, dimensions.width]
  );

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: crop.x, originY: crop.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;
    const dx = (e.clientX - dragRef.current.startX) * scaleX;
    const dy = (e.clientY - dragRef.current.startY) * scaleY;
    setCrop((c) =>
      clampCrop({
        ...c,
        x: Math.round(dragRef.current!.originX + dx),
        y: Math.round(dragRef.current!.originY + dy),
      })
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  async function handleConfirm() {
    setProcessing(true);
    try {
      const blob = await cropImageToBlob(file, crop, "image/webp", 0.92);
      const cropped = new File([blob], file.name.replace(/\.\w+$/, "") + "-cropped.webp", {
        type: "image/webp",
      });
      onConfirm(cropped);
    } finally {
      setProcessing(false);
    }
  }

  const cropLeftPct = (crop.x / dimensions.width) * 100;
  const cropTopPct = (crop.y / dimensions.height) * 100;
  const cropWidthPct = (crop.width / dimensions.width) * 100;
  const cropHeightPct = (crop.height / dimensions.height) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background p-4 shadow-2xl sm:p-6">
        <h3 className="text-lg font-semibold">Crop banner to 3:1</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag the selection to frame your banner. Output will be optimized to{" "}
          {BANNER_UPLOAD.recommendedWidth}×{BANNER_UPLOAD.recommendedHeight} px.
        </p>

        <div
          ref={containerRef}
          className="relative mt-4 aspect-[3/2] w-full overflow-hidden rounded-lg bg-muted touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {previewUrl && (
            <Image src={previewUrl} alt="Crop preview" fill className="object-contain" unoptimized />
          )}
          <div className="absolute inset-0 bg-black/45" />
          <div
            className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={{
              left: `${cropLeftPct}%`,
              top: `${cropTopPct}%`,
              width: `${cropWidthPct}%`,
              height: `${cropHeightPct}%`,
            }}
            onPointerDown={onPointerDown}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing}>
            {processing ? "Processing…" : "Crop & continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
