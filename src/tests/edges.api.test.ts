import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock prisma
vi.mock('@/lib/db', () => import('./__mocks__/dbMock'))

import { GET, POST } from '@/app/api/edges/route'
import { _resetRateLimitStore } from '@/lib/rateLimit'

function req(body: any, ip = '1.2.3.4') {
  return new Request('http://test/api/edges', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  })
}

describe('edges API', () => {
  beforeEach(() => _resetRateLimitStore())

  it('GET returns list', async () => {
    const res = await GET()
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST respects rate limit', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await POST(req({ sport: 'NBA' }))
      expect(r.status).toBe(201)
    }
    const blocked = await POST(req({ sport: 'NBA' }))
    expect(blocked.status).toBe(429)
  })
})
