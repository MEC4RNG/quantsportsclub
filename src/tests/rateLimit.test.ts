import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, _resetRateLimitStore } from '@/lib/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => {
    _resetRateLimitStore()
    // Force tests to use the in-memory fallback (avoid hitting Upstash if you set those envs)
    process.env.UPSTASH_REDIS_REST_URL = ''
    process.env.UPSTASH_REDIS_REST_TOKEN = ''
  })

  it('allows under the limit', async () => {
    const key = 't:1'
    const res1 = await rateLimit({ key, limit: 2, windowMs: 60_000 })
    const res2 = await rateLimit({ key, limit: 2, windowMs: 60_000 })
    expect(res1.ok).toBe(true)
    expect(res2.ok).toBe(true)
  })

  it('blocks when over the limit', async () => {
    const key = 't:2'
    await rateLimit({ key, limit: 2, windowMs: 60_000 })
    await rateLimit({ key, limit: 2, windowMs: 60_000 })
    const res3 = await rateLimit({ key, limit: 2, windowMs: 60_000 })
    expect(res3.ok).toBe(false)
  })
})
