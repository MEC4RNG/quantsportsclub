type Key = string
type Entry = { count: number; reset: number }

const store = new Map<Key, Entry>()

export function rateLimit(params: { key: string; limit: number; windowMs: number }) {
  const { key, limit, windowMs } = params
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.reset < now) {
    const next = { count: 1, reset: now + windowMs }
    store.set(key, next)
    return { ok: true, remaining: limit - 1, reset: next.reset }
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, reset: entry.reset }
  }

  entry.count += 1
  return { ok: true, remaining: limit - entry.count, reset: entry.reset }
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  const xr = req.headers.get('x-real-ip')
  if (xr) return xr.trim()
  return '127.0.0.1'
}

// test-only helper
export function _resetRateLimitStore() {
  store.clear()
}
