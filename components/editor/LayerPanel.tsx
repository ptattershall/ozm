"use client";

import React from "react";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";

export const LayerPanel = () => {
  const layers = useEditorStore((s) => s.layers);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const selectObjectById = useEditorStore((s) => s.selectObjectById);

  const handleLayerClick = (id: string) => {
    selectObjectById(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectObjectById(id);
    }
  };

  if (layers.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Layers
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No objects on canvas. Add a shape or load an SVG to see layers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Layers
      </h2>
      <ul className="flex flex-col gap-0.5" role="listbox" aria-label="Canvas layers">
        {[...layers].reverse().map((layer) => {
          const isSelected = layer.id === selectedObjectId;
          return (
            <li key={layer.id} role="option" aria-selected={isSelected}>
              <button
                type="button"
                onClick={() => handleLayerClick(layer.id)}
                onKeyDown={(e) => handleKeyDown(e, layer.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                  "hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500",
                  isSelected &&
                    "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                )}
                aria-label={`Select layer ${layer.name}`}
                tabIndex={0}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px]",
                    isSelected
                      ? "border-zinc-500 bg-zinc-300 dark:border-zinc-400 dark:bg-zinc-600"
                      : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                  )}
                  aria-hidden
                >
                  {layer.zIndex + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{layer.name}</span>
                {layer.locked && (
                  <span
                    className="shrink-0 text-zinc-400 dark:text-zinc-500"
                    title="Locked"
                    aria-hidden
                  >
                    🔒
                  </span>
                )}
                {layer.hidden && (
                  <span
                    className="shrink-0 text-zinc-400 dark:text-zinc-500"
                    title="Hidden"
                    aria-hidden
                  >
                    👁‍🗨
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
