import type { Canvas } from "fabric";

/** Custom properties to include in canvas JSON (name, layerType, assetId live under data). */
export const CANVAS_JSON_CUSTOM_PROPS = ["data"] as const;

/**
 * Serializes the canvas to JSON including custom props (data: id, name, layerType, assetId).
 * Use for saving design state to the database.
 */
export function canvasToJson(canvas: Canvas): string {
  const obj = canvas.toObject(CANVAS_JSON_CUSTOM_PROPS as unknown as string[]);
  return JSON.stringify(obj);
}
