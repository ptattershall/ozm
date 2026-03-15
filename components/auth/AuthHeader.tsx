"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const AuthHeader = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <header
        className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90"
        aria-label="Account navigation"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Loading…
          </span>
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90"
      aria-label="Account navigation"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
        {session?.user ? (
          <>
            <span
              className="max-w-[180px] truncate text-xs text-zinc-600 dark:text-zinc-300 sm:max-w-none"
              title={session.user.email ?? undefined}
            >
              {session.user.email ?? session.user.name ?? "Signed in"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              aria-label="Sign out"
              onClick={() => signOut()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  signOut();
                }
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href="/signin" aria-label="Sign in">
              Sign in
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
};
