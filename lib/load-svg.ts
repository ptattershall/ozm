import { loadSVGFromString, Group, type Canvas, type FabricObject } from "fabric";

const BASE_LAYER_ID = "base-layer";
const BASE_LAYER_NAME = "Base";

export type LoadSvgResult = { success: true; group: FabricObject } | { success: false; error: string };

/**
 * Loads an SVG string into Fabric, groups all elements, centers the group on the canvas,
 * and marks it as the lockable base layer.
 * @param svg - Raw SVG string (will be sanitized in a later phase; caller should validate length).
 * @param canvas - Fabric canvas to add the group to.
 * @returns Result with the added group or a friendly error message.
 */
export async function loadSvgFromString(
  svg: string,
  canvas: Canvas
): Promise<LoadSvgResult> {
  const trimmed = svg.trim();
  if (!trimmed) {
    return { success: false, error: "SVG content is empty." };
  }

  try {
    const result = await loadSVGFromString(trimmed);
    const raw = result.objects ?? [];
    const objects = raw.filter((o): o is FabricObject => o != null);
    if (objects.length === 0) {
      return { success: false, error: "SVG could not be parsed into any objects." };
    }

    const group = new Group(objects, {
      originX: "center",
      originY: "center",
      subTargetCheck: true,
    });

    const w = canvas.getWidth();
    const h = canvas.getHeight();
    group.set({
      left: w / 2,
      top: h / 2,
      data: {
        id: BASE_LAYER_ID,
        name: BASE_LAYER_NAME,
        layerType: "base",
      },
    });

    canvas.add(group);
    canvas.sendObjectToBack(group);
    canvas.requestRenderAll();

    return { success: true, group };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message.includes("Invalid") || message.includes("parse")
        ? "Invalid SVG. Check that the content is valid SVG markup."
        : `Could not load SVG: ${message}`,
    };
  }
}

export type LoadAccessoryResult =
  | { success: true; group: FabricObject }
  | { success: false; error: string };

/**
 * Loads an SVG string as an accessory: group centered on canvas with layerType "accessory".
 * @param svg - Raw SVG string.
 * @param canvas - Fabric canvas.
 * @param assetId - Id from manifest (stored in object data).
 * @param name - Display name for the layer.
 * @param defaultZ - Steps back from top (0 = on top; higher = further back).
 */
export async function loadAccessoryFromString(
  svg: string,
  canvas: Canvas,
  assetId: string,
  name: string,
  defaultZ: number = 0
): Promise<LoadAccessoryResult> {
  const trimmed = svg.trim();
  if (!trimmed) {
    return { success: false, error: "SVG content is empty." };
  }

  try {
    const result = await loadSVGFromString(trimmed);
    const raw = result.objects ?? [];
    const objects = raw.filter((o): o is FabricObject => o != null);
    if (objects.length === 0) {
      return { success: false, error: "SVG could not be parsed into any objects." };
    }

    const group = new Group(objects, {
      originX: "center",
      originY: "center",
      subTargetCheck: true,
    });

    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const instanceId = `accessory-${assetId}-${Date.now()}`;
    group.set({
      left: w / 2,
      top: h / 2,
      data: {
        id: instanceId,
        name,
        layerType: "accessory",
        assetId,
      },
    });

    canvas.add(group);
    for (let i = 0; i < defaultZ; i++) {
      canvas.sendObjectBackwards(group);
    }
    canvas.setActiveObject(group);
    canvas.requestRenderAll();

    return { success: true, group };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message.includes("Invalid") || message.includes("parse")
        ? "Invalid SVG. Check that the content is valid SVG markup."
        : `Could not load accessory: ${message}`,
    };
  }
}
