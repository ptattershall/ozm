/**
 * Client-side canvas export helpers.
 * Canvas is 512×512; use multiplier to get PNG size: 512 * multiplier = output pixels.
 */

import type { Canvas } from "fabric";

const CANVAS_SIZE = 512;

/**
 * Trigger a file download from a blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Trigger a file download from a data URL (e.g. PNG base64).
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/**
 * Export canvas as SVG string and trigger download.
 */
export function exportCanvasToSvg(canvas: Canvas, filename: string = "fantasy-emoji.svg"): void {
  const svg = canvas.toSVG({
    viewBox: { x: 0, y: 0, width: CANVAS_SIZE, height: CANVAS_SIZE },
    encoding: "UTF-8",
  });
  const blob = new Blob([svg], { type: "image/svg+xml" });
  downloadBlob(blob, filename);
}

/**
 * Export canvas as thumbnail PNG data URL (128×128, multiplier 0.25).
 * For use when saving a design: upload to storage and set thumbnailUrl.
 */
export function getThumbnailDataUrl(canvas: Canvas): string {
  const multiplier = 0.25;
  return canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier,
  });
}

/**
 * Export canvas as PNG data URL at the given pixel size (128, 256, or 512).
 * Uses transparent background (canvas should have backgroundColor: 'transparent').
 */
export function exportCanvasToPngDataUrl(
  canvas: Canvas,
  size: 128 | 256 | 512
): string {
  const multiplier = size / CANVAS_SIZE;
  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier,
  });
  return dataUrl;
}

/**
 * Export canvas as PNG and trigger download at the given size.
 */
export function exportCanvasToPng(
  canvas: Canvas,
  size: 128 | 256 | 512,
  filename?: string
): void {
  const dataUrl = exportCanvasToPngDataUrl(canvas, size);
  const name = filename ?? `fantasy-emoji-${size}.png`;
  downloadDataUrl(dataUrl, name);
}
