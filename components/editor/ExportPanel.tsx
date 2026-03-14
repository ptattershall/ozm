"use client";

import React, { useCallback, useState } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { Button } from "@/components/ui/button";
import {
  exportCanvasToSvg,
  exportCanvasToPng,
  exportCanvasToPngDataUrl,
} from "@/lib/export-canvas";

const PNG_SIZES = [128, 256, 512] as const;

export type ExportPanelProps = {
  /** Current design ID for optional upload and filename context. */
  designId?: string;
};

export const ExportPanel = ({ designId }: ExportPanelProps) => {
  const getCanvas = useEditorStore((s) => s.getCanvas);
  const [exportError, setExportError] = useState<string | null>(null);
  const [uploadingSize, setUploadingSize] = useState<number | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const canvas = getCanvas?.() ?? null;
  const canUpload = Boolean(designId && designId !== "new" && canvas);

  const handleExportSvg = useCallback(() => {
    setExportError(null);
    if (!canvas) {
      setExportError("Canvas not ready.");
      return;
    }
    try {
      const name = designId && designId !== "new" ? `design-${designId}.svg` : "fantasy-emoji.svg";
      exportCanvasToSvg(canvas, name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setExportError(message || "Export failed.");
    }
  }, [canvas, designId]);

  const handleExportPng = useCallback(
    (size: 128 | 256 | 512) => {
      setExportError(null);
      if (!canvas) {
        setExportError("Canvas not ready.");
        return;
      }
      try {
        const name =
          designId && designId !== "new"
            ? `design-${designId}-${size}.png`
            : `fantasy-emoji-${size}.png`;
        exportCanvasToPng(canvas, size, name);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setExportError(message || "Export failed.");
      }
    },
    [canvas, designId]
  );

  const handleUploadPng = useCallback(
    async (size: 128 | 256 | 512) => {
      setExportError(null);
      setUploadedUrl(null);
      if (!canvas || !designId || designId === "new") {
        setExportError("Save the design first to upload exports.");
        return;
      }
      setUploadingSize(size);
      try {
        const dataUrl = exportCanvasToPngDataUrl(canvas, size);
        const res = await fetch("/api/upload-export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designId, size, dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setExportError(data.error ?? "Upload failed.");
          return;
        }
        setUploadedUrl(data.url ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setExportError(message || "Upload failed.");
      } finally {
        setUploadingSize(null);
      }
    },
    [canvas, designId]
  );

  const handleCopyUploadUrl = useCallback(() => {
    if (!uploadedUrl) return;
    void navigator.clipboard.writeText(uploadedUrl);
  }, [uploadedUrl]);

  return (
    <div className="space-y-3 rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-zinc-950/60">
      <p className="font-medium text-zinc-700 dark:text-zinc-200">Export</p>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Download the canvas as SVG or PNG (transparent background). Sizes match common emoji presets.
      </p>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleExportSvg}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleExportSvg();
            }
          }}
          disabled={!canvas}
          aria-label="Export as SVG"
        >
          Export SVG
        </Button>

        <div className="flex flex-wrap gap-2">
          {PNG_SIZES.map((size) => (
            <Button
              key={size}
              type="button"
              variant="outline"
              size="sm"
              className="min-w-16 flex-1 text-xs"
              onClick={() => handleExportPng(size)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleExportPng(size);
                }
              }}
              disabled={!canvas}
              aria-label={`Export PNG ${size}×${size}`}
            >
              PNG {size}
            </Button>
          ))}
        </div>

        {canUpload && (
          <>
            <p className="pt-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Upload to storage
            </p>
            <div className="flex flex-wrap gap-2">
              {PNG_SIZES.map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-16 flex-1 text-xs"
                  onClick={() => handleUploadPng(size)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleUploadPng(size);
                    }
                  }}
                  disabled={!canvas || uploadingSize !== null}
                  aria-busy={uploadingSize === size}
                  aria-label={`Upload PNG ${size} to storage`}
                >
                  {uploadingSize === size ? "Uploading…" : `Upload ${size}`}
                </Button>
              ))}
            </div>
            {uploadedUrl && (
              <div className="flex flex-col gap-1">
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Download URL:</p>
                <div className="flex gap-1">
                  <input
                    type="text"
                    readOnly
                    value={uploadedUrl}
                    className="min-w-0 flex-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px] dark:border-zinc-600 dark:bg-zinc-800"
                    aria-label="Export download URL"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={handleCopyUploadUrl}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCopyUploadUrl();
                      }
                    }}
                    aria-label="Copy URL"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {exportError && (
        <p className="text-[11px] text-red-600 dark:text-red-400" role="alert">
          {exportError}
        </p>
      )}
    </div>
  );
};
