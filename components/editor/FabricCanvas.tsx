"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, Rect, type FabricObject } from "fabric";
import { useEditorStore } from "@/lib/store/editor-store";
import { loadSvgFromString, loadAccessoryFromString } from "@/lib/load-svg";
import { canvasToJson } from "@/lib/canvas-serialization";

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

export type AddAccessoryOptions = {
  svgUrl: string;
  assetId: string;
  name: string;
  defaultZ?: number;
};

export type FabricCanvasRef = {
  getCanvas: () => Canvas | null;
  getCanvasJson: () => string;
  addDummyObject: () => void;
  addAccessory: (options: AddAccessoryOptions) => Promise<{ success: boolean; error?: string }>;
  loadSvg: (svg: string) => Promise<{ success: boolean; error?: string }>;
  loadFromJSON: (canvasJson: string) => Promise<{ success: boolean; error?: string }>;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  setLockSelected: (locked: boolean) => void;
  /** Remove the currently selected object(s) from the canvas. */
  removeSelectedObject: () => void;
};

const UNDO_THROTTLE_MS = 500;

type FabricCanvasProps = {
  className?: string;
  onSelectionChange?: (objectId: string | null, objectType: string | null) => void;
  /** When set, fetch this URL and load the SVG into the canvas after mount. */
  initialSvgUrl?: string | null;
  /** When set, load this canvas JSON (saved design). Takes precedence over initialSvgUrl when both exist. */
  initialCanvasJson?: string | null;
  /** Called after object:modified (throttled). Use to push undo snapshot; skip if applying undo/redo. */
  onObjectModifiedForUndo?: (getCanvasJson: () => string) => void;
  /** Optional undo/redo: when provided, toolbar shows Undo/Redo buttons. */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Called once after initial SVG/JSON load. Use to push initial state to undo stack. */
  onInitialLoad?: (getCanvasJson: () => string) => void;
  ref?: React.Ref<FabricCanvasRef | null>;
};

const syncLayersFromStore = () => useEditorStore.getState().syncLayers();

function FabricCanvasInner(
  {
    className,
    onSelectionChange,
    initialSvgUrl,
    initialCanvasJson,
    onObjectModifiedForUndo,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    onInitialLoad,
  }: FabricCanvasProps,
  forwardedRef: React.Ref<FabricCanvasRef | null>
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const [hasDummy, setHasDummy] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [svgLoadError, setSvgLoadError] = useState<string | null>(null);
  const [svgPasteValue, setSvgPasteValue] = useState("");
  const [showSvgUpload, setShowSvgUpload] = useState(false);
  const setSelection = useEditorStore((s) => s.setSelection);
  const initialSvgUrlRef = useRef(initialSvgUrl);
  initialSvgUrlRef.current = initialSvgUrl;
  const initialCanvasJsonRef = useRef(initialCanvasJson);
  initialCanvasJsonRef.current = initialCanvasJson;

  const getCanvas = useCallback(() => canvasRef.current ?? null, []);

  const handleSelectionChange = useCallback(
    (objectId: string | null, objectType: string | null) => {
      setSelection(objectId, objectType);
      onSelectionChange?.(objectId, objectType);
    },
    [setSelection, onSelectionChange]
  );

  const addDummyObject = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || hasDummy) return;
    const rect = new Rect({
      left: 160,
      top: 160,
      width: 192,
      height: 192,
      fill: "rgba(120, 80, 200, 0.6)",
      stroke: "rgb(80, 50, 150)",
      strokeWidth: 2,
    });
    rect.set("data", { id: "dummy-rect", type: "rect" });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
    setHasDummy(true);
    handleSelectionChange("dummy-rect", "rect");
    syncLayersFromStore();
  }, [hasDummy, handleSelectionChange]);

  const runOnActive = useCallback(
    (fn: (obj: FabricObject) => void) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (active && !Array.isArray(active)) {
        fn(active);
        canvas.requestRenderAll();
      }
    },
    []
  );

  const bringForward = useCallback(() => runOnActive((obj) => canvasRef.current?.bringObjectForward(obj)), [runOnActive]);
  const sendBackward = useCallback(() => runOnActive((obj) => canvasRef.current?.sendObjectBackwards(obj)), [runOnActive]);
  const bringToFront = useCallback(() => runOnActive((obj) => canvasRef.current?.bringObjectToFront(obj)), [runOnActive]);
  const sendToBack = useCallback(() => runOnActive((obj) => canvasRef.current?.sendObjectToBack(obj)), [runOnActive]);

  const setLockSelected = useCallback((locked: boolean) => {
    runOnActive((obj) => {
      obj.set({
        lockMovementX: locked,
        lockMovementY: locked,
        lockRotation: locked,
        lockScalingX: locked,
        lockScalingY: locked,
      });
    });
  }, [runOnActive]);

  const removeSelectedObject = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      canvas.remove(active);
      canvas.discardActiveObject();
      handleSelectionChange(null, null);
      syncLayersFromStore();
      canvas.requestRenderAll();
    }
  }, [handleSelectionChange]);

  const loadSvg = useCallback(async (svg: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return { success: false, error: "Canvas not ready." };
    setSvgLoadError(null);
    const result = await loadSvgFromString(svg, canvas);
    if (result.success) {
      canvas.discardActiveObject();
      handleSelectionChange(null, null);
      syncLayersFromStore();
      return { success: true };
    }
    setSvgLoadError(result.error);
    return { success: false, error: result.error };
  }, [handleSelectionChange]);

  const getCanvasJson = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvasToJson(canvas);
  }, []);

  const loadFromJSON = useCallback(async (canvasJson: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return { success: false, error: "Canvas not ready." };
    setSvgLoadError(null);
    try {
      const parsed = typeof canvasJson === "string" ? JSON.parse(canvasJson) : canvasJson;
      await canvas.loadFromJSON(parsed);
      canvas.discardActiveObject();
      handleSelectionChange(null, null);
      syncLayersFromStore();
      canvas.requestRenderAll();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSvgLoadError("Failed to load saved design.");
      return { success: false, error: message };
    }
  }, [handleSelectionChange]);

  const addAccessory = useCallback(
    async ({ svgUrl, assetId, name, defaultZ = 0 }: AddAccessoryOptions) => {
      const canvas = canvasRef.current;
      if (!canvas) return { success: false, error: "Canvas not ready." };
      setSvgLoadError(null);
      try {
        const res = await fetch(svgUrl);
        if (!res.ok) return { success: false, error: "Failed to load accessory." };
        const text = await res.text();
        const result = await loadAccessoryFromString(
          text,
          canvas,
          assetId,
          name,
          defaultZ
        );
        if (result.success) {
          handleSelectionChange(
            (result.group.get("data") as { id?: string })?.id ?? null,
            "group"
          );
          syncLayersFromStore();
          return { success: true };
        }
        setSvgLoadError(result.error);
        return { success: false, error: result.error };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setSvgLoadError("Failed to add accessory.");
        return { success: false, error: message };
      }
    },
    [handleSelectionChange]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvasEl = document.createElement("canvas");
    container.appendChild(canvasEl);

    const canvas = new Canvas(canvasEl, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      preserveObjectStacking: true,
      backgroundColor: "transparent",
    });
    canvasRef.current = canvas;

    const handleSelectionCreated = (e: { selected?: FabricObject[]; target?: FabricObject }) => {
      const target = e.target ?? e.selected?.[0];
      if (target && !Array.isArray(target)) {
        const data = target.get("data") as { id?: string; type?: string } | undefined;
        handleSelectionChange(data?.id ?? null, data?.type ?? target.type ?? null);
      } else {
        handleSelectionChange(null, null);
      }
    };

    const handleSelectionCleared = () => {
      handleSelectionChange(null, null);
    };

    const handleSelectionUpdated = (e: { selected?: FabricObject[]; deselected?: FabricObject[] }) => {
      const selected = e.selected ?? [];
      const active = selected[selected.length - 1];
      if (active && !Array.isArray(active)) {
        const data = active.get("data") as { id?: string; type?: string } | undefined;
        handleSelectionChange(data?.id ?? null, data?.type ?? active.type ?? null);
      } else {
        handleSelectionChange(null, null);
      }
    };

    let undoThrottleId: ReturnType<typeof setTimeout> | null = null;
    const handleObjectAdded = () => syncLayersFromStore();
    const handleObjectRemoved = () => syncLayersFromStore();
    const handleObjectModified = () => {
      syncLayersFromStore();
      useEditorStore.getState().incrementObjectModified();
      if (onObjectModifiedForUndo) {
        if (undoThrottleId) clearTimeout(undoThrottleId);
        undoThrottleId = setTimeout(() => {
          undoThrottleId = null;
          onObjectModifiedForUndo(getCanvasJson);
        }, UNDO_THROTTLE_MS);
      }
    };

    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:cleared", handleSelectionCleared);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("object:added", handleObjectAdded);
    canvas.on("object:removed", handleObjectRemoved);
    canvas.on("object:modified", handleObjectModified);

    useEditorStore.getState().setCanvasGetter(getCanvas);
    syncLayersFromStore();
    setCanvasReady(true);

    return () => {
      if (undoThrottleId) clearTimeout(undoThrottleId);
      setCanvasReady(false);
      useEditorStore.getState().setCanvasGetter(null);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("object:added", handleObjectAdded);
      canvas.off("object:removed", handleObjectRemoved);
      canvas.off("object:modified", handleObjectModified);
      canvas.destroy();
      canvasRef.current = null;
      if (canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    };
  }, [handleSelectionChange, getCanvas, getCanvasJson, onObjectModifiedForUndo]);

  const initialLoadFiredRef = useRef(false);
  useEffect(() => {
    const json = initialCanvasJsonRef.current;
    const url = initialSvgUrlRef.current;
    if (!canvasReady || !canvasRef.current) return;
    const fireInitialLoad = () => {
      if (!initialLoadFiredRef.current && onInitialLoad) {
        initialLoadFiredRef.current = true;
        onInitialLoad(getCanvasJson);
      }
    };
    if (json?.trim()) {
      loadFromJSON(json).then(() => fireInitialLoad());
      return;
    }
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const text = await res.text();
        if (cancelled) return;
        await loadSvg(text);
        if (!cancelled) fireInitialLoad();
      } catch {
        if (!cancelled) setSvgLoadError("Failed to load SVG from URL.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSvgUrl, initialCanvasJson, canvasReady, loadSvg, loadFromJSON, getCanvasJson, onInitialLoad]);

  const handleSvgFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setSvgPasteValue(text);
      setSvgLoadError(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleLoadSvgClick = useCallback(() => {
    loadSvg(svgPasteValue);
  }, [loadSvg, svgPasteValue]);

  useEffect(() => {
    const api: FabricCanvasRef = {
      getCanvas,
      getCanvasJson,
      addDummyObject,
      addAccessory,
      loadSvg,
      loadFromJSON,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      setLockSelected,
      removeSelectedObject,
    };
    if (typeof forwardedRef === "function") forwardedRef(api);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<FabricCanvasRef | null>).current = api;
    return () => {
      if (typeof forwardedRef === "function") forwardedRef(null);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<FabricCanvasRef | null>).current = null;
    };
  }, [getCanvas, getCanvasJson, addDummyObject, addAccessory, loadSvg, loadFromJSON, bringForward, sendBackward, bringToFront, sendToBack, setLockSelected, removeSelectedObject, forwardedRef]);

  return (
    <div className={className} ref={containerRef}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100/80 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={addDummyObject}
            disabled={hasDummy}
            className="rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
            aria-label="Add dummy rectangle"
          >
            Add dummy rect
          </button>
          <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
          <button
            type="button"
            onClick={bringToFront}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Bring to front"
          >
            Front
          </button>
          <button
            type="button"
            onClick={bringForward}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Bring forward"
          >
            Fwd
          </button>
          <button
            type="button"
            onClick={sendBackward}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Send backward"
          >
            Back
          </button>
          <button
            type="button"
            onClick={sendToBack}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Send to back"
          >
            To back
          </button>
          <button
            type="button"
            onClick={() => setLockSelected(true)}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Lock selected"
          >
            Lock
          </button>
          <button
            type="button"
            onClick={() => setLockSelected(false)}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Unlock selected"
          >
            Unlock
          </button>
          {typeof onUndo === "function" && (
            <>
              <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-600"
                aria-label="Undo"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-600"
                aria-label="Redo"
              >
                Redo
              </button>
            </>
          )}
          <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
          <button
            type="button"
            onClick={removeSelectedObject}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Delete selected object"
          >
            Delete
          </button>
          <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
          <button
            type="button"
            onClick={() => setShowSvgUpload((v) => !v)}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
            aria-label="Toggle upload SVG panel"
            aria-expanded={showSvgUpload}
          >
            Upload SVG
          </button>
        </div>
      </div>
      {showSvgUpload && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900/80">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Paste SVG or choose a file (for testing)
          </p>
          <textarea
            value={svgPasteValue}
            onChange={(e) => {
              setSvgPasteValue(e.target.value);
              setSvgLoadError(null);
            }}
            placeholder="<svg>...</svg>"
            rows={4}
            className="w-full resize-y rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 font-mono text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder:text-zinc-500"
            aria-label="SVG markup"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSvgClick}
              disabled={!svgPasteValue.trim()}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
              aria-label="Load SVG onto canvas"
            >
              Load SVG
            </button>
            <label className="cursor-pointer rounded border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600">
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleSvgFileChange}
                className="sr-only"
                aria-label="Choose SVG file"
              />
              Choose file
            </label>
          </div>
          {svgLoadError && (
            <p
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {svgLoadError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export const FabricCanvas = React.forwardRef(FabricCanvasInner) as (
  props: FabricCanvasProps & { ref?: React.Ref<FabricCanvasRef | null> }
) => React.ReactElement;
