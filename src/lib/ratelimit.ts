import "server-only";
import { env, integrations } from "@/lib/env";

/**
 * Rate limiting + lightweight cache.
 *
 *  - Upstash configured  -> sliding-window limiter backed by Redis (works across
 *    serverless instances).
 *  - not configured      -> in-process Map limiter. Correct for a single
 *    instance / local dev; NOT a real cross-instance guarantee (documented).
 */

type Limiter = (key: string) => Promise<{ success: boolean; remaining: number; reset: number }>;

interface Bucket {
  count: number;
  resetAt: number;
}
const memory = new Map<string, Bucket>();

function memoryLimiter(limit: number, windowMs: number): Limiter {
  return async (key) => {
    const now = Date.now();
    const b = memory.get(key);
    if (!b || b.resetAt < now) {
      memory.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: limit - 1, reset: now + windowMs };
    }
    b.count++;
    return { success: b.count <= limit, remaining: Math.max(0, limit - b.count), reset: b.resetAt };
  };
}

let upstashModule: Promise<Limiter> | null = null;
async function upstashLimiter(limit: number, windowMs: number): Promise<Limiter> {
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL as string,
    token: env.UPSTASH_REDIS_REST_TOKEN as string,
  });
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
    prefix: "oe:rl",
  });
  return async (key) => {
    const res = await rl.limit(key);
    return { success: res.success, remaining: res.remaining, reset: res.reset };
  };
}

/**
 * @param name  logical bucket (e.g. "ai", "auth", "generator")
 * @param key   per-subject key (usually the user id or IP)
 */
export async function rateLimit(
  name: string,
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const bucketKey = `${name}:${key}`;
  if (integrations.redis) {
    upstashModule ??= upstashLimiter(opts.limit, opts.windowMs);
    try {
      return (await upstashModule)(bucketKey);
    } catch {
      // fall back rather than fail open too hard
    }
  }
  return memoryLimiter(opts.limit, opts.windowMs)(bucketKey);
}

/** Preset buckets used across the app. */
export const RL = {
  ai: { limit: 20, windowMs: 60_000 },
  generator: { limit: 12, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
  mutation: { limit: 60, windowMs: 60_000 },
  import: { limit: 5, windowMs: 60_000 },
} as const;
