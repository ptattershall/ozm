"use client";

import { create } from "zustand";
import type { Canvas } from "fabric";

export type LayerItem = {
  id: string;
  name: string;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
};

type EditorState = {
  /** Getter for the Fabric canvas; set by FabricCanvas on mount. */
  getCanvas: (() => Canvas | null) | null;
  selectedObjectId: string | null;
  selectedObjectType: string | null;
  layers: LayerItem[];
  /** Incremented on object:modified so PropertiesPanel can re-read active object. */
  objectModifiedVersion: number;
};

type EditorActions = {
  setCanvasGetter: (getter: (() => Canvas | null) | null) => void;
  setSelection: (objectId: string | null, objectType: string | null) => void;
  /** Rebuild layers from current canvas objects (call after add/remove/reorder). */
  syncLayers: () => void;
  /** Select an object by id (e.g. from layer panel row click). */
  selectObjectById: (id: string) => void;
  /** Call when active object is modified (e.g. drag) so panels can re-read. */
  incrementObjectModified: () => void;
};

export type EditorStore = EditorState & EditorActions;

function buildLayersFromCanvas(getCanvas: () => Canvas | null): LayerItem[] {
  const canvas = getCanvas();
  if (!canvas) return [];

  const objects = canvas.getObjects();
  return objects.map((obj, index) => {
    const data = (obj.get("data") as { id?: string; name?: string; type?: string } | undefined) ?? {};
    const id = data.id ?? `obj-${index}`;
    const name = data.name ?? data.id ?? (obj.type ?? "object");
    const locked =
      !!obj.lockMovementX ||
      !!obj.lockMovementY ||
      !!obj.lockRotation ||
      !!obj.lockScalingX ||
      !!obj.lockScalingY;
    const visible = obj.visible;
    return {
      id,
      name: String(name),
      zIndex: index,
      locked,
      hidden: visible === false,
    };
  });
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  getCanvas: null,
  selectedObjectId: null,
  selectedObjectType: null,
  layers: [],
  objectModifiedVersion: 0,

  setCanvasGetter: (getter) => set({ getCanvas: getter }),

  setSelection: (objectId, objectType) =>
    set({ selectedObjectId: objectId, selectedObjectType: objectType }),

  incrementObjectModified: () =>
    set((s) => ({ objectModifiedVersion: s.objectModifiedVersion + 1 })),

  syncLayers: () => {
    const { getCanvas } = get();
    if (!getCanvas) return;
    set({ layers: buildLayersFromCanvas(getCanvas) });
  },

  selectObjectById: (id) => {
    const { getCanvas } = get();
    const canvas = getCanvas?.() ?? null;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const obj = objects.find((o) => {
      const data = (o.get("data") as { id?: string } | undefined);
      return data?.id === id;
    });

    if (obj) {
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      const data = obj.get("data") as { id?: string; type?: string } | undefined;
      set({
        selectedObjectId: data?.id ?? id,
        selectedObjectType: data?.type ?? obj.type ?? null,
      });
    }
  },
}));
