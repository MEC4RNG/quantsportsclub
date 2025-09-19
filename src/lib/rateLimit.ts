// src/lib/rateLimit.ts
// In-memory rate limiter with optional Upstash REST compatibility.
// Tests rely on `_resetRateLimitStore`, so we export it.

type Bucket = { count: number; reset: number; limit: number }
const buckets = new Map<string, Bucket>()

/**
 * Basic in-memory limiter. If UPSTASH_REDIS_REST_URL/TOKEN are defined,
 * you could wire a remote limiter here (left as in-mem for simplicity & tests).
 */
export async function rateLimit(opts: {
  key: string
  limit: number
  windowMs: number
}): Promise<{
  ok: boolean
  remaining: number
  reset: number
  limit: number
}> {
  const { key, limit, windowMs } = opts
  const now = Date.now()
  const found = buckets.get(key)

  // New or expired bucket
  if (!found || now >= found.reset) {
    const reset = now + windowMs
    buckets.set(key, { count: 1, reset, limit })
    return { ok: true, remaining: limit - 1, reset, limit }
  }

  // Existing active bucket
  if (found.count >= found.limit) {
    return { ok: false, remaining: 0, reset: found.reset, limit: found.limit }
  }

  found.count += 1
  return {
    ok: true,
    remaining: found.limit - found.count,
    reset: found.reset,
    limit: found.limit,
  }
}

/** Test helper: clear all in-memory buckets */
export function _resetRateLimitStore(): void {
  buckets.clear()
}

/** Compat re-export so older imports still work */
export { getClientIp } from './ip'
