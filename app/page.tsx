import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fantasy Emoji Forge",
  description:
    "Create and customize fantasy emojis. Generate SVG emojis from a prompt, add accessories, and export for stickers or avatars.",
};

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-b from-violet-50 via-indigo-50/80 to-slate-100 dark:from-violet-950/95 dark:via-indigo-950/90 dark:to-slate-950">
      {/* Ambient glow orbs */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-violet-400/30 blur-[120px] dark:bg-violet-500/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-[120px] dark:bg-fuchsia-500/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-200/25 blur-[100px] dark:bg-amber-500/10"
        aria-hidden
      />

      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-12 px-6 py-20">
        <header className="text-center">
          <p className="mb-4 flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            <span className="opacity-80">✦</span>
            <span>Forge your legend</span>
            <span className="opacity-80">✦</span>
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="bg-linear-to-r from-violet-700 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent dark:from-violet-300 dark:via-fuchsia-300 dark:to-amber-200">
              Fantasy Emoji
            </span>
            <br />
            <span className="mt-1 block text-zinc-800 dark:text-zinc-100">Forge</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Summon a base emoji from a single prompt. Crown it with horns, auras, and magic—then
            export your creation at 128, 256, or 512px.
          </p>
        </header>

        <div className="w-full max-w-md rounded-2xl border border-violet-200/60 bg-white/70 px-8 py-8 shadow-xl shadow-violet-900/10 backdrop-blur-sm dark:border-violet-500/20 dark:bg-white/5 dark:shadow-violet-950/30">
          <p className="mb-6 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Choose sticker or bold-outline style, then edit on the canvas and add accessories
            before export.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-linear-to-r from-violet-600 to-fuchsia-600 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/30 dark:shadow-violet-500/20 dark:hover:shadow-violet-500/25"
            >
              <Link href="/create" aria-label="Go to create page to generate an emoji">
                Create an emoji
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-violet-300 font-medium text-violet-700 hover:bg-violet-50 hover:text-violet-800 dark:border-violet-500/50 dark:text-violet-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
            >
              <Link href="/design/demo" aria-label="Open editor with demo design">
                Open editor
              </Link>
            </Button>
          </div>
        </div>

        <footer className="mt-auto flex gap-4 pt-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            href="/create"
            className="transition hover:text-violet-600 hover:underline dark:hover:text-violet-400"
          >
            Create
          </Link>
          <span className="select-none">·</span>
          <Link
            href="/design/demo"
            className="transition hover:text-violet-600 hover:underline dark:hover:text-violet-400"
          >
            Editor
          </Link>
        </footer>
      </main>
    </div>
  );
}
