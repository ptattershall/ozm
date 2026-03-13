import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Create Emoji | Fantasy Emoji Forge",
  description: "Generate a fantasy emoji SVG from a text prompt.",
};

const styles = [
  { id: "sticker", label: "Sticker" },
  { id: "bold-outline", label: "Bold outline" },
];

const CreatePage = () => {
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
              placeholder='e.g. "Elf archer with crystal bow, neon outline"'
              aria-label="Describe the emoji you want to create"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Style
            </p>
            <div className="inline-flex gap-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
              {styles.map((style) => (
                <Button
                  key={style.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-white text-xs font-medium shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:ring-zinc-700 dark:hover:bg-zinc-900"
                  aria-label={`Emoji style: ${style.label}`}
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
              aria-label="Generate emoji from prompt"
            >
              Generate emoji
            </Button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Generation and error handling will be wired up after the AI
              endpoint is implemented.
            </p>
          </div>

          <div
            aria-live="polite"
            className="hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            Something went wrong generating your emoji. Please try again.
          </div>
        </section>

        <section className="flex w-full flex-1 items-stretch lg:w-1/2">
          <div className="flex w-full flex-col justify-between rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <div className="space-y-2">
              <p className="font-medium text-zinc-700 dark:text-zinc-200">
                Preview
              </p>
              <p>
                Once generation is wired up, your AI-created base emoji will
                appear here before opening in the editor.
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950">
              Canvas and Fabric integration will be added in the editor step.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CreatePage;

