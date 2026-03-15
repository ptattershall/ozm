/**
 * Prompt filtering for generate-svg: length cap and optional blocked terms.
 * Length is enforced in the route Zod schema; this module adds blocked-terms checks.
 */

const MAX_PROMPT_LENGTH = 500;

function getBlockedTerms(): string[] {
  const raw = process.env["BLOCKED_PROMPT_TERMS"];
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

let cachedBlockedTerms: string[] | null = null;

function getBlockedTermsCached(): string[] {
  if (cachedBlockedTerms === null) {
    cachedBlockedTerms = getBlockedTerms();
  }
  return cachedBlockedTerms;
}

export const PROMPT_MAX_LENGTH = MAX_PROMPT_LENGTH;

export type PromptFilterResult =
  | { allowed: true }
  | { allowed: false; error: string };

/**
 * Validates prompt for content policy. Call after Zod parse (length already enforced).
 * - Checks optional BLOCKED_PROMPT_TERMS (comma-separated, case-insensitive).
 */
export function validatePrompt(prompt: string): PromptFilterResult {
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      allowed: false,
      error: `Prompt must be at most ${MAX_PROMPT_LENGTH} characters.`,
    };
  }

  const blocked = getBlockedTermsCached();
  if (blocked.length === 0) return { allowed: true };

  const lower = prompt.toLowerCase();
  const found = blocked.find((term) => lower.includes(term));
  if (found) {
    return {
      allowed: false,
      error: "Your prompt contains a term that is not allowed.",
    };
  }

  return { allowed: true };
}
