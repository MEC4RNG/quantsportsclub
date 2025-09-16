import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, _resetRateLimitStore } from '@/lib/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => _resetRateLimitStore())

  it('allows under the limit', () => {
    const key = 't:1'
    const res1 = rateLimit({ key, limit: 2, windowMs: 60_000 })
    const res2 = rateLimit({ key, limit: 2, windowMs: 60_000 })
    expect(res1.ok).toBe(true)
    expect(res2.ok).toBe(true)
  })

  it('blocks when over the limit', () => {
    const key = 't:2'
    rateLimit({ key, limit: 2, windowMs: 60_000 })
    rateLimit({ key, limit: 2, windowMs: 60_000 })
    const res3 = rateLimit({ key, limit: 2, windowMs: 60_000 })
    expect(res3.ok).toBe(false)
  })
})
