"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";

import { FabricCanvas, type FabricCanvasRef } from "@/components/editor/FabricCanvas";
import { AccessoryPanel } from "@/components/editor/AccessoryPanel";
import { LayerPanel } from "@/components/editor/LayerPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { ExportPanel } from "@/components/editor/ExportPanel";
import { Button } from "@/components/ui/button";
import { getThumbnailDataUrl } from "@/lib/export-canvas";
import { useEditorStore } from "@/lib/store/editor-store";
import type { AccessoryAsset } from "@/types/accessories";

const DRAFT_STORAGE_KEY_PREFIX = "ozmoji-draft-";
const DRAFT_SAVE_DEBOUNCE_MS = 2000;

type DraftPayload = { baseSvgUrl: string; canvasJson: string; savedAt: number };

export type DesignEditorProps = {
  designId: string;
  /** Only set when designId === "new" (from query param). */
  baseSvgUrlFromQuery: string | null;
};

export const DesignEditor = ({
  designId,
  baseSvgUrlFromQuery,
}: DesignEditorProps) => {
  const canvasRef = useRef<FabricCanvasRef | null>(null);
  const skipPushUndoRef = useRef(false);
  const lastSnapshotRef = useRef<string | null>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [baseSvgUrl, setBaseSvgUrl] = useState<string | null>(baseSvgUrlFromQuery);
  const [canvasJson, setCanvasJson] = useState<string | null>(null);
  const [initialJsonToLoad, setInitialJsonToLoad] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    designId === "new" ? "ready" : "loading"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [accessoryError, setAccessoryError] = useState<string | null>(null);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  useEffect(() => {
    if (designId === "new") {
      setBaseSvgUrl(baseSvgUrlFromQuery);
      setCanvasJson(null);
      setLoadState("ready");
      try {
        const key = `${DRAFT_STORAGE_KEY_PREFIX}new`;
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
        const draft = raw ? (JSON.parse(raw) as DraftPayload) : null;
        if (draft?.baseSvgUrl && draft.baseSvgUrl === baseSvgUrlFromQuery && draft.canvasJson) {
          setInitialJsonToLoad(draft.canvasJson);
        } else {
          setInitialJsonToLoad(null);
        }
      } catch {
        setInitialJsonToLoad(null);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadState("loading");
      try {
        const res = await fetch(`/api/load-design?id=${encodeURIComponent(designId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setLoadState("error");
          return;
        }
        setBaseSvgUrl(data.baseSvgUrl ?? null);
        setCanvasJson(data.canvasJson ?? null);
        try {
          const key = `${DRAFT_STORAGE_KEY_PREFIX}${designId}`;
          const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
          const draft = raw ? (JSON.parse(raw) as DraftPayload) : null;
          if (draft?.canvasJson) {
            setInitialJsonToLoad(draft.canvasJson);
          } else {
            setInitialJsonToLoad(data.canvasJson ?? null);
          }
        } catch {
          setInitialJsonToLoad(data.canvasJson ?? null);
        }
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [designId, baseSvgUrlFromQuery]);

  useEffect(() => {
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
        draftSaveTimeoutRef.current = null;
      }
    };
  }, []);

  const handleAddAccessory = useCallback(
    async (asset: AccessoryAsset) => {
      setAccessoryError(null);
      const canvas = canvasRef.current;
      if (!canvas) {
        setAccessoryError("Canvas not ready.");
        return;
      }
      const result = await canvas.addAccessory({
        svgUrl: asset.svgUrl,
        assetId: asset.id,
        name: asset.name,
        defaultZ: asset.defaultZ ?? 0,
      });
      if (!result.success) {
        setAccessoryError(result.error ?? "Could not add accessory.");
      }
    },
    []
  );

  const handleInitialLoad = useCallback((getCanvasJson: () => string) => {
    lastSnapshotRef.current = getCanvasJson() || null;
  }, []);

  const handlePushUndoAndDraft = useCallback(
    (getCanvasJson: () => string) => {
      if (skipPushUndoRef.current) return;
      const prev = lastSnapshotRef.current;
      if (prev) pushUndo(prev);
      lastSnapshotRef.current = getCanvasJson() || null;
      if (typeof window === "undefined" || !baseSvgUrl) return;
      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = setTimeout(() => {
        draftSaveTimeoutRef.current = null;
        try {
          const key = `${DRAFT_STORAGE_KEY_PREFIX}${designId}`;
          window.localStorage.setItem(
            key,
            JSON.stringify({
              baseSvgUrl,
              canvasJson: getCanvasJson(),
              savedAt: Date.now(),
            } as DraftPayload)
          );
        } catch {
          // ignore quota or parse errors
        }
      }, DRAFT_SAVE_DEBOUNCE_MS);
    },
    [baseSvgUrl, designId, pushUndo]
  );

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentJson = canvas.getCanvasJson();
    if (!currentJson) return;
    const result = undo(currentJson);
    if (!result) return;
    lastSnapshotRef.current = result.snapshotToApply;
    skipPushUndoRef.current = true;
    canvas.loadFromJSON(result.snapshotToApply).then(() => {
      setTimeout(() => {
        skipPushUndoRef.current = false;
      }, 600);
    });
  }, [undo]);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentJson = canvas.getCanvasJson();
    if (!currentJson) return;
    const result = redo(currentJson);
    if (!result) return;
    lastSnapshotRef.current = result.snapshotToApply;
    skipPushUndoRef.current = true;
    canvas.loadFromJSON(result.snapshotToApply).then(() => {
      setTimeout(() => {
        skipPushUndoRef.current = false;
      }, 600);
    });
  }, [redo]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.("input") || target?.closest?.("textarea") || target?.closest?.("[contenteditable]")) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = canvas.getCanvas()?.getActiveObject();
        if (active) {
          e.preventDefault();
          const json = canvas.getCanvasJson();
          if (json) pushUndo(json);
          canvas.removeSelectedObject();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pushUndo, handleUndo, handleRedo]);

  const handleSave = useCallback(async () => {
    if (!baseSvgUrl) {
      setSaveError("No base image to save. Open a design from the create page first.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      setSaveError("Canvas not ready.");
      return;
    }
    const json = canvas.getCanvasJson();
    if (!json) {
      setSaveError("Canvas is empty.");
      return;
    }
    const fabricCanvas = canvas.getCanvas();
    if (!fabricCanvas) {
      setSaveError("Canvas not ready.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      const thumbnailDataUrl = getThumbnailDataUrl(fabricCanvas);
      const res = await fetch("/api/save-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSvgUrl,
          canvasJson: json,
          designId: designId === "new" ? undefined : designId,
          thumbnailDataUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save.");
        return;
      }
      const savedId = data.designId;
      try {
        window.localStorage.removeItem(`${DRAFT_STORAGE_KEY_PREFIX}${designId === "new" ? "new" : designId}`);
      } catch {
        // ignore
      }
      if (designId === "new" && savedId) {
        window.location.href = `/design/${savedId}`;
        return;
      }
    } catch {
      setSaveError("Network error.");
    } finally {
      setIsSaving(false);
    }
  }, [designId, baseSvgUrl]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-900 hover:underline dark:text-zinc-50"
            >
              Fantasy Emoji Forge
            </Link>
            <span className="hidden h-4 w-px bg-zinc-200 dark:bg-zinc-800 sm:inline-block" />
            <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
              Editing design <span className="font-mono text-zinc-700 dark:text-zinc-200">#{designId}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/create"
              className="hidden text-xs font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300 sm:inline"
            >
              Back to create
            </Link>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isSaving || !baseSvgUrl}
              aria-busy={isSaving}
              aria-label="Save design"
              onClick={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSave();
                }
              }}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {saveError && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row">
        <aside className="w-full space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 lg:w-64">
          <AccessoryPanel
            onAddAccessory={handleAddAccessory}
            onAddError={setAccessoryError}
          />
          {accessoryError && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {accessoryError}
            </p>
          )}
        </aside>

        <section className="flex min-h-[420px] flex-1 items-stretch">
          <div className="flex w-full flex-col justify-between rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Canvas
              </h2>
              <p className="text-sm">
                The Fabric.js canvas will render here, with your base SVG centered and ready for accessories.
              </p>
            </div>
            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              {loadState === "loading" && (
                <div className="flex flex-col items-center gap-4" aria-live="polite">
                  <div
                    className="h-[320px] w-full max-w-[512px] animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700"
                    aria-hidden
                  />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading design…</p>
                </div>
              )}
              {loadState === "error" && (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">Failed to load design.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Retry loading design"
                    onClick={() => {
                      setLoadState("loading");
                      fetch(`/api/load-design?id=${encodeURIComponent(designId)}`)
                        .then((res) => {
                          if (!res.ok) {
                            setLoadState("error");
                            return;
                          }
                          return res.json().catch(() => ({}));
                        })
                        .then((data) => {
                          if (!data) return;
                          setBaseSvgUrl(data.baseSvgUrl ?? null);
                          setCanvasJson(data.canvasJson ?? null);
                          setInitialJsonToLoad(data.canvasJson ?? null);
                          setLoadState("ready");
                        })
                        .catch(() => setLoadState("error"));
                    }}
                  >
                    Retry
                  </Button>
                </div>
              )}
              {(loadState === "ready" || loadState === "idle") && (
                <FabricCanvas
                  ref={canvasRef}
                  className="w-full max-w-[512px]"
                  initialSvgUrl={initialJsonToLoad ? null : baseSvgUrl}
                  initialCanvasJson={initialJsonToLoad}
                  onObjectModifiedForUndo={handlePushUndoAndDraft}
                  onInitialLoad={handleInitialLoad}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={undoStack.length > 0}
                  canRedo={redoStack.length > 0}
                />
              )}
            </div>
          </div>
        </section>

        <aside className="flex w-full flex-col gap-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 lg:w-72">
          <LayerPanel />
          <PropertiesPanel />
          <ExportPanel designId={designId} />
        </aside>
      </main>
    </div>
  );
};
