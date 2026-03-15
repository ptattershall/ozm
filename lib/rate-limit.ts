/**
 * Rate limiting for /api/generate-svg and other abuse-prone endpoints.
 * - IP-based per-minute and daily limits.
 * - Optional user-based limits when auth exists (stricter of IP vs user).
 * - In-memory store; use Redis/Vercel KV in production for multi-instance.
 */

const PER_MINUTE_WINDOW_MS = 60_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getEnvInt = (key: string, fallback: number): number => {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : Math.max(0, n);
};

export const RATE_LIMIT_PER_MINUTE = getEnvInt("RATE_LIMIT_PER_MINUTE", 15);
export const RATE_LIMIT_DAILY_FREE = getEnvInt("RATE_LIMIT_DAILY_FREE", 50);

type WindowEntry = { count: number; resetAt: number };

const perMinuteMap = new Map<string, WindowEntry>();
const dailyMap = new Map<string, WindowEntry>();

function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkWindow(
  map: Map<string, WindowEntry>,
  key: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (now >= entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      remaining: 0,
    };
  }
  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export type RateLimitResult =
  | { allowed: true; retryAfter?: number }
  | { allowed: false; retryAfter?: number; error: string };

/**
 * Check rate limit for generate-svg. Uses IP always; when userId is provided
 * also enforces per-user limits (stricter of the two).
 */
export function checkGenerateSvgRateLimit(
  request: Request,
  userId: string | null
): RateLimitResult {
  const ip = getClientIp(request.headers);

  const perMinuteIp = checkWindow(
    perMinuteMap,
    `min:${ip}`,
    PER_MINUTE_WINDOW_MS,
    RATE_LIMIT_PER_MINUTE
  );
  if (!perMinuteIp.allowed) {
    return {
      allowed: false,
      retryAfter: perMinuteIp.retryAfter,
      error: "Too many requests per minute. Please try again later.",
    };
  }

  if (RATE_LIMIT_DAILY_FREE > 0) {
    const dailyIp = checkWindow(
      dailyMap,
      `day:ip:${ip}`,
      ONE_DAY_MS,
      RATE_LIMIT_DAILY_FREE
    );
    if (!dailyIp.allowed) {
      return {
        allowed: false,
        retryAfter: dailyIp.retryAfter,
        error: "Daily generation limit reached. Try again tomorrow.",
      };
    }

    if (userId) {
      const dailyUser = checkWindow(
        dailyMap,
        `day:user:${userId}`,
        ONE_DAY_MS,
        RATE_LIMIT_DAILY_FREE
      );
      if (!dailyUser.allowed) {
        return {
          allowed: false,
          retryAfter: dailyUser.retryAfter,
          error: "Daily generation limit reached. Try again tomorrow.",
        };
      }
    }
  }

  if (userId) {
    const perMinuteUser = checkWindow(
      perMinuteMap,
      `min:user:${userId}`,
      PER_MINUTE_WINDOW_MS,
      RATE_LIMIT_PER_MINUTE
    );
    if (!perMinuteUser.allowed) {
      return {
        allowed: false,
        retryAfter: perMinuteUser.retryAfter,
        error: "Too many requests per minute. Please try again later.",
      };
    }
  }

  return { allowed: true };
}

export { getClientIp };
