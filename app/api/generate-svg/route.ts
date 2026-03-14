import { z, flattenError } from "zod";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateSvg } from "@/lib/ai";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { uploadSvgAndGetUrl } from "@/lib/storage";

const CANVAS_SIZE = 512;

const GenerateSvgSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(500, "Prompt too long"),
  style: z.string().max(50).optional().default("sticker"),
});

/** In-memory rate limit: IP -> { count, resetAt }. Section 14 will add robust limits. */
const rateLimitMap = new Map<
  string,
  { count: number; resetAt: number }
>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;

function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const ip = getClientIp(request.headers);

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: rate.retryAfter
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
      ip,
    })
  );

  return NextResponse.json({
    svgUrl: url,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  });
}
