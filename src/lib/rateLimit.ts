import type { Ratelimit as RLType } from '@upstash/ratelimit'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Key = string
type Entry = { count: number; reset: number }
const store = new Map<Key, Entry>() // in-memory fallback

let rl: RLType | null = null
const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
if (hasUpstash) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: false,
  })
}

export async function rateLimit(params: { key: string; limit: number; windowMs: number }) {
  const { key, limit, windowMs } = params
  const now = Date.now()

  if (rl) {
    const res = await rl.limit(key)
    return {
      ok: res.success,
      remaining: res.remaining,
      reset: typeof res.reset === 'number' ? res.reset : Number(res.reset),
      limit: res.limit,
    }
  }

  // Fallback: in-memory (single-process)
  const entry = store.get(key)
  if (!entry || entry.reset < now) {
    const next = { count: 1, reset: now + windowMs }
    store.set(key, next)
    return { ok: true, remaining: limit - 1, reset: next.reset, limit }
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, reset: entry.reset, limit }
  }
  entry.count += 1
  return { ok: true, remaining: limit - entry.count, reset: entry.reset, limit }
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  const xr = req.headers.get('x-real-ip')
  if (xr) return xr.trim()
  return '127.0.0.1'
}

// test-only
export function _resetRateLimitStore() {
  store.clear()
}
