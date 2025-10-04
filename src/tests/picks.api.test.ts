// src/tests/picks.api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET as GET_PICKS } from '@/app/api/picks/route'
import { _resetRateLimitStore } from '@/lib/rateLimit'

// --- Mock the Prisma client used by the route
vi.mock('@/lib/db', () => import('./__mocks__/dbMock'))

// --- Force a stable IP inside tests
vi.mock('@/lib/ip', () => ({
  getClientIp: () => '1.2.3.4',
}))

// Build a Request with optional query params
function req(path = '/api/picks', qp?: Record<string, string>) {
  const url = new URL('http://localhost' + path)
  if (qp) for (const [k, v] of Object.entries(qp)) url.searchParams.set(k, v)
  return new Request(url.toString(), {
    method: 'GET',
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}

describe('picks API', () => {
  beforeEach(() => {
    // Use in-memory limiter; clear counts for a clean slate
    process.env.UPSTASH_REDIS_REST_URL = ''
    process.env.UPSTASH_REDIS_REST_TOKEN = ''
    _resetRateLimitStore()
  })

  it('GET returns list', async () => {
    const res = await GET_PICKS(req('/api/picks', { sport: 'NBA', limit: '5' }))
    expect(res.status).toBe(200)

    const rows = await res.json()
    expect(Array.isArray(rows)).toBe(true)
    // basic shape assertions (loosely)
    if (rows.length > 0) {
      const r = rows[0]
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('sport')
      expect(r).toHaveProperty('market')
      expect(r).toHaveProperty('edgePct')
    }
  })

  it('GET respects rate limit', async () => {
    // Route uses limit=60/min per IP; hit it 61 times
    let last = 0
    for (let i = 0; i < 61; i++) {
      const res = await GET_PICKS(req('/api/picks'))
      last = res.status
    }
    expect(last).toBe(429)
  })
})
