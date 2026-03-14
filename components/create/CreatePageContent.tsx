"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STYLES = [
  { id: "sticker", label: "Sticker" },
  { id: "bold-outline", label: "Bold outline" },
];

export const CreatePageContent = () => {
  const [prompt, setPrompt] = useState("");
  const [styleId, setStyleId] = useState("sticker");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateClick = useCallback(async () => {
    if (isGenerating) return;
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Please enter a description for your emoji.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-svg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, style: styleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      const svgUrl = data.svgUrl;
      if (svgUrl) {
        const params = new URLSearchParams({ baseSvgUrl: svgUrl });
        window.location.href = `/design/new?${params.toString()}`;
        return;
      }
      setError("No SVG URL returned. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, styleId, isGenerating]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-900 hover:underline dark:text-zinc-50"
            >
              Fantasy Emoji Forge
            </Link>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Describe your idea and generate a base emoji SVG to edit.
            </p>
          </div>
          <Link
            href="/design/demo"
            className="hidden rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900 sm:inline-flex"
          >
            Open editor shell
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col gap-8 px-4 py-8 lg:flex-row">
        <section className="flex w-full flex-col gap-6 lg:w-1/2">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Describe your fantasy emoji
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              For example: &quot;Goblin wizard with glowing eyes and a tiny spellbook.&quot;
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              name="prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Elf archer with crystal bow, neon outline"'
              aria-label="Describe the emoji you want to create"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Style
            </p>
            <div className="inline-flex gap-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
              {STYLES.map((style) => (
                <Button
                  key={style.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`rounded-full text-xs font-medium shadow-sm ring-1 transition dark:ring-zinc-700 ${
                    styleId === style.id
                      ? "bg-white ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      : "bg-transparent ring-transparent hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                  }`}
                  aria-label={`Emoji style: ${style.label}`}
                  aria-pressed={styleId === style.id}
                  onClick={() => setStyleId(style.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setStyleId(style.id);
                    }
                  }}
                >
                  {style.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={isGenerating}
              aria-busy={isGenerating}
              onClick={handleGenerateClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateClick();
                }
              }}
              aria-label="Generate emoji from prompt"
            >
              {isGenerating ? "Generating..." : "Generate emoji"}
            </Button>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}
        </section>

        <section className="flex w-full flex-1 items-stretch lg:w-1/2">
          <div className="flex w-full flex-col justify-between rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <div className="space-y-2">
              <p className="font-medium text-zinc-700 dark:text-zinc-200">
                Preview
              </p>
              <p>
                Click Generate to create your emoji. You&apos;ll be taken to the
                editor to add accessories and export.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
