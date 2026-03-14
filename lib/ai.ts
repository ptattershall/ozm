import OpenAI from "openai";

const API_KEY = process.env["AI_PROVIDER_API_KEY"];
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 60_000;

const STYLE_PROMPTS: Record<string, string> = {
  sticker:
    "Render in a clean sticker style: bold shapes, limited detail, suitable for a small icon. Use solid fills and simple outlines.",
  "bold-outline":
    "Render with a bold outline style: thick black or dark outlines around all shapes, filled with solid colors. High contrast, graphic novel look.",
};

const SYSTEM_PROMPT = `You are an SVG generator for fantasy emoji icons. You must respond with exactly one valid SVG document and nothing else.

Rules:
- Output ONLY the raw SVG markup. No explanation, no markdown code fence, no surrounding text.
- Root element must be <svg> with viewBox="0 0 512 512" and width="512" height="512".
- Use only safe SVG: paths, circles, rects, polygons, groups. No script, no foreignObject, no external resources.
- Design for a 512×512 viewport. Center the composition.
- Use inline fill and stroke. Prefer simple, bold shapes that scale well.`;

export type GenerateSvgResult =
  | { success: true; svg: string }
  | { success: false; error: string };

/**
 * Builds the user prompt for sticker SVG generation with optional style.
 */
export function buildStickerPrompt(userPrompt: string, styleId: string): string {
  const styleHint = STYLE_PROMPTS[styleId] ?? STYLE_PROMPTS.sticker;
  return `Create a single fantasy emoji icon as an SVG.

Style: ${styleHint}

User description: ${userPrompt}

Respond with only the SVG markup, no other text.`;
}

/**
 * Extracts raw SVG string from model response (handles markdown code blocks or plain SVG).
 */
function extractSvgFromResponse(content: string | null): string | null {
  if (!content || typeof content !== "string") return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  const codeBlockMatch = trimmed.match(/```(?:svg)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  if (trimmed.startsWith("<svg") && trimmed.includes("</svg>")) {
    const end = trimmed.indexOf("</svg>") + 6;
    return trimmed.slice(0, end);
  }

  return null;
}

/**
 * Calls the AI provider to generate an SVG from a text prompt.
 * Returns raw SVG string or a normalized error.
 */
export async function generateSvg(
  userPrompt: string,
  styleId: string
): Promise<GenerateSvgResult> {
  if (!API_KEY) {
    return { success: false, error: "AI provider is not configured." };
  }

  const prompt = buildStickerPrompt(userPrompt, styleId);

  const client = new OpenAI({
    apiKey: API_KEY,
  });

  try {
    const completion = await client.chat.completions.create(
      {
        model: process.env["AI_PROVIDER_MODEL"] ?? DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const rawContent =
      completion.choices?.[0]?.message?.content ?? null;
    const svg = extractSvgFromResponse(rawContent);

    if (!svg || !svg.includes("<svg")) {
      return {
        success: false,
        error: "The model did not return a valid SVG. Please try a different prompt.",
      };
    }

    return { success: true, svg };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return { success: false, error: "Request timed out. Please try again." };
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return { success: false, error: "Too many requests. Please wait a moment." };
    }
    if (message.includes("API key") || message.includes("401")) {
      return { success: false, error: "AI provider is not configured correctly." };
    }
    return {
      success: false,
      error: "Failed to generate SVG. Please try again.",
    };
  }
}
