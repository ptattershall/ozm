import { z, flattenError } from "zod";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { generateSvg } from "@/lib/ai";
import { checkGenerateSvgRateLimit, getClientIp } from "@/lib/rate-limit";
import { validatePrompt } from "@/lib/prompt-filter";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { uploadSvgAndGetUrl } from "@/lib/storage";

const CANVAS_SIZE = 512;

const GenerateSvgSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(500, "Prompt must be at most 500 characters"),
  style: z.string().max(50).optional().default("sticker"),
});

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const rate = checkGenerateSvgRateLimit(request, userId);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: rate.error },
      {
        status: 429,
        headers:
          rate.retryAfter !== undefined
            ? { "Retry-After": String(rate.retryAfter) }
            : undefined,
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = GenerateSvgSchema.safeParse(body);
  if (!parsed.success) {
    const flat = flattenError(parsed.error);
    const message =
      flat.formErrors?.[0] ?? Object.values(flat.fieldErrors ?? {})?.[0]?.[0] ?? "Validation failed.";
    return NextResponse.json({ error: String(message) }, { status: 400 });
  }

  const { prompt, style } = parsed.data;

  const filterResult = validatePrompt(prompt);
  if (!filterResult.allowed) {
    return NextResponse.json(
      { error: filterResult.error },
      { status: 400 }
    );
  }

  const aiResult = await generateSvg(prompt, style);

  if (!aiResult.success) {
    return NextResponse.json(
      { error: aiResult.error },
      { status: 422 }
    );
  }

  const rawSvg = aiResult.svg;
  const sanitized = sanitizeSvg(rawSvg);

  if (!sanitized.trim()) {
    return NextResponse.json(
      { error: "Generated SVG was invalid or empty after sanitization." },
      { status: 422 }
    );
  }

  const id = randomUUID();
  let url: string;
  try {
    const result = await uploadSvgAndGetUrl(id, sanitized);
    url = result.url;
  } catch (err) {
    console.error("[generate-svg] Storage upload failed:", err);
    return NextResponse.json(
      { error: "Failed to save generated SVG." },
      { status: 500 }
    );
  }

  const durationMs = Date.now() - startedAt;
  console.info(
    "[generate-svg]",
    JSON.stringify({
      durationMs,
      promptLength: prompt.length,
      responseSize: sanitized.length,
      ip: getClientIp(request.headers),
      userId: userId ?? undefined,
    })
  );

  return NextResponse.json({
    svgUrl: url,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  });
}
