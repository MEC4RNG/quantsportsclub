import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock prisma
vi.mock('@/lib/db', () => import('./__mocks__/dbMock'))

import { GET, POST } from '@/app/api/bankroll/route'
import { _resetRateLimitStore } from '@/lib/rateLimit'

function req(body: any, ip = '5.6.7.8') {
  return new Request('http://test/api/bankroll', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  })
}

describe('bankroll API', () => {
  beforeEach(() => _resetRateLimitStore())

  it('GET returns list', async () => {
    const res = await GET()
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST respects rate limit', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await POST(req({ userId: 'u1', kind: 'deposit', units: 10 }))
      expect(r.status).toBe(201)
    }
    const blocked = await POST(req({ userId: 'u1', kind: 'deposit', units: 10 }))
    expect(blocked.status).toBe(429)
  })
})
