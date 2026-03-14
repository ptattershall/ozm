"use client";

import React, { useCallback, useMemo } from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FabricObject } from "fabric";
import { cn } from "@/lib/utils";

const PALETTE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ffffff",
  "#78716c",
  "#0f172a",
] as const;

function getEffectiveFill(obj: FabricObject): string | null {
  const fill = obj.get("fill");
  if (typeof fill === "string" && fill) return fill;
  const group = obj as FabricObject & { getObjects?: () => FabricObject[] };
  const objects = group.getObjects?.() ?? [];
  for (const child of objects) {
    const childFill = getEffectiveFill(child);
    if (childFill) return childFill;
  }
  return null;
}

function setFillOnObject(obj: FabricObject, color: string): void {
  obj.set("fill", color);
  const group = obj as FabricObject & { getObjects?: () => FabricObject[] };
  const objects = group.getObjects?.() ?? [];
  for (const child of objects) {
    setFillOnObject(child, color);
  }
}

export const PropertiesPanel = () => {
  const getCanvas = useEditorStore((s) => s.getCanvas);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const objectModifiedVersion = useEditorStore((s) => s.objectModifiedVersion);

  const canvas = getCanvas?.() ?? null;
  const active = useMemo(() => {
    if (!canvas || !selectedObjectId) return null;
    const obj = canvas.getActiveObject();
    if (!obj || Array.isArray(obj)) return null;
    const data = obj.get("data") as { id?: string } | undefined;
    return data?.id === selectedObjectId ? obj : null;
  }, [canvas, selectedObjectId, objectModifiedVersion]);

  const runOnActive = useCallback(
    (fn: (obj: FabricObject) => void) => {
      const c = getCanvas?.() ?? null;
      if (!c) return;
      const obj = c.getActiveObject();
      if (!obj || Array.isArray(obj)) return;
      fn(obj);
      obj.setCoords?.();
      c.requestRenderAll();
      useEditorStore.getState().incrementObjectModified();
    },
    [getCanvas]
  );

  const setProp = useCallback(
    (key: string, value: number | boolean) => {
      runOnActive((obj) => obj.set(key as keyof FabricObject, value));
    },
    [runOnActive]
  );

  const handleLockToggle = useCallback(() => {
    if (!active) return;
    const locked = !!(
      active.lockMovementX ||
      active.lockMovementY ||
      active.lockRotation ||
      active.lockScalingX ||
      active.lockScalingY
    );
    runOnActive((obj) =>
      obj.set({
        lockMovementX: !locked,
        lockMovementY: !locked,
        lockRotation: !locked,
        lockScalingX: !locked,
        lockScalingY: !locked,
      })
    );
  }, [active, runOnActive]);

  const handleResetTransforms = useCallback(() => {
    runOnActive((obj) => {
      obj.set({
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        flipX: false,
        flipY: false,
      });
    });
  }, [runOnActive]);

  const handleFillChange = useCallback(
    (color: string) => {
      runOnActive((obj) => {
        setFillOnObject(obj, color);
      });
    },
    [runOnActive]
  );

  if (!selectedObjectId) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Properties
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Select an object on the canvas or in the Layers panel to edit its properties.
        </p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Properties
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Selection not found. Select an object from the canvas or layers.
        </p>
      </div>
    );
  }

  const left = Number(active.left) ?? 0;
  const top = Number(active.top) ?? 0;
  const scaleX = Number(active.scaleX) ?? 1;
  const scaleY = Number(active.scaleY) ?? 1;
  const angle = Number(active.angle) ?? 0;
  const opacity = Math.round((Number(active.opacity) ?? 1) * 100);
  const flipX = !!active.flipX;
  const flipY = !!active.flipY;
  const locked = !!(
    active.lockMovementX ||
    active.lockMovementY ||
    active.lockRotation ||
    active.lockScalingX ||
    active.lockScalingY
  );
  const currentFill = getEffectiveFill(active);

  const inputClass =
    "w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500";

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Properties
      </h2>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="prop-x" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              X
            </Label>
            <input
              id="prop-x"
              type="number"
              value={Math.round(left)}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (!Number.isNaN(v)) setProp("left", v);
              }}
              className={inputClass}
              aria-label="Position X"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prop-y" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Y
            </Label>
            <input
              id="prop-y"
              type="number"
              value={Math.round(top)}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (!Number.isNaN(v)) setProp("top", v);
              }}
              className={inputClass}
              aria-label="Position Y"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="prop-scaleX" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Scale X
            </Label>
            <input
              id="prop-scaleX"
              type="number"
              step={0.01}
              min={0.01}
              max={10}
              value={scaleX.toFixed(2)}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (!Number.isNaN(v) && v > 0) setProp("scaleX", v);
              }}
              className={inputClass}
              aria-label="Scale X"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="prop-scaleY" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Scale Y
            </Label>
            <input
              id="prop-scaleY"
              type="number"
              step={0.01}
              min={0.01}
              max={10}
              value={scaleY.toFixed(2)}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                if (!Number.isNaN(v) && v > 0) setProp("scaleY", v);
              }}
              className={inputClass}
              aria-label="Scale Y"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="prop-rotation" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Rotation (°)
          </Label>
          <input
            id="prop-rotation"
            type="number"
            step={1}
            value={Math.round(angle)}
            onChange={(e) => {
              const v = Number.parseFloat(e.target.value);
              if (!Number.isNaN(v)) setProp("angle", v);
            }}
            className={inputClass}
            aria-label="Rotation in degrees"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="prop-opacity" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Opacity (%)
          </Label>
          <input
            id="prop-opacity"
            type="number"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(v) && v >= 0 && v <= 100) setProp("opacity", v / 100);
            }}
            className={inputClass}
            aria-label="Opacity percentage"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setProp("flipX", !flipX)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setProp("flipX", !flipX);
              }
            }}
            aria-pressed={flipX}
            aria-label="Flip horizontal"
          >
            Flip H
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setProp("flipY", !flipY)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setProp("flipY", !flipY);
              }
            }}
            aria-pressed={flipY}
            aria-label="Flip vertical"
          >
            Flip V
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleLockToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleLockToggle();
              }
            }}
            aria-pressed={locked}
            aria-label={locked ? "Unlock object" : "Lock object"}
          >
            {locked ? "Unlock" : "Lock"}
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full text-xs"
          onClick={handleResetTransforms}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleResetTransforms();
            }
          }}
          aria-label="Reset scale, rotation, and flip"
        >
          Reset transforms
        </Button>

        <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Color (fill)
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              value={currentFill ?? "#3b82f6"}
              onChange={(e) => handleFillChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-800"
              aria-label="Fill color"
            />
            <div className="flex flex-wrap gap-1" role="group" aria-label="Color palette">
              {PALETTE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleFillChange(color)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleFillChange(color);
                    }
                  }}
                  className={cn(
                    "h-6 w-6 rounded border-2 border-zinc-200 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-600",
                    currentFill === color && "ring-2 ring-zinc-500 ring-offset-2 dark:ring-zinc-400"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Apply color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
