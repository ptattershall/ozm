"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { AccessoryAsset, AccessoriesManifest } from "@/types/accessories";

export type AccessoryPanelProps = {
  /** Add accessory to canvas; may be async. Panel disables the button until resolved. */
  onAddAccessory: (asset: AccessoryAsset) => void | Promise<void>;
  /** Called when add fails (e.g. canvas not ready). */
  onAddError?: (message: string) => void;
};

const MANIFEST_URL = "/assets/manifest.json";

export const AccessoryPanel = ({
  onAddAccessory,
  onAddError,
}: AccessoryPanelProps) => {
  const [manifest, setManifest] = useState<AccessoriesManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(MANIFEST_URL);
        if (!res.ok) throw new Error("Failed to load accessories.");
        const data = await res.json();
        if (!cancelled) setManifest(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    if (!manifest) return ["all"];
    return ["all", ...manifest.categories];
  }, [manifest]);

  const filteredAssets = useMemo(() => {
    if (!manifest) return [];
    let list = manifest.assets;
    if (category !== "all") {
      list = list.filter((a) => a.category === category);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [manifest, category, search]);

  const handleAdd = useCallback(
    async (asset: AccessoryAsset) => {
      setAddingId(asset.id);
      try {
        await Promise.resolve(onAddAccessory(asset));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not add.";
        onAddError?.(message);
      } finally {
        setAddingId(null);
      }
    },
    [onAddAccessory, onAddError]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, asset: AccessoryAsset) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleAdd(asset);
      }
    },
    [handleAdd]
  );

  if (loadError) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Accessories
        </h2>
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Accessories
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Accessories
      </h2>

      <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setCategory(cat);
              }
            }}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500",
              category === cat
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
            )}
            aria-pressed={category === cat}
            aria-label={`Category: ${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Search accessories by name or tag</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search (e.g. fire, crystal)"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
          aria-label="Search accessories by name or tag"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filteredAssets.length === 0 ? (
          <p className="col-span-full text-xs text-zinc-500 dark:text-zinc-400">
            No accessories match.
          </p>
        ) : (
          filteredAssets.map((asset) => {
            const isAdding = addingId === asset.id;
            return (
              <button
                key={asset.id}
                type="button"
                disabled={isAdding}
                onClick={() => handleAdd(asset)}
                onKeyDown={(e) => handleKeyDown(e, asset)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-center transition-colors dark:border-zinc-700 dark:bg-zinc-800/80",
                  "hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500",
                  "disabled:opacity-60 disabled:pointer-events-none"
                )}
                aria-label={`Add ${asset.name} to canvas`}
                aria-busy={isAdding}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                  <img
                    src={asset.svgUrl}
                    alt=""
                    className="h-8 w-8 object-contain"
                  />
                </span>
                <span className="line-clamp-2 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {asset.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
