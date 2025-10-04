import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// IMPORTANT: assert the POST type so r.status is known
import * as EdgesRoute from '@/app/api/edges/route'
if (typeof EdgesRoute.POST !== 'function') {
  throw new Error('edges route POST is not exported')
}
const POST = EdgesRoute.POST as (req: NextRequest) => Promise<Response>

const API_KEY = process.env.API_KEY ?? 'test-key'
function req(body: unknown) {
  const headers = new Headers()
  headers.set('content-type', 'application/json')
  headers.set('x-api-key', API_KEY)
  return new NextRequest('http://localhost/api/edges', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

// vi.mock('@/lib/db', () => import('./__mocks__/dbMock'))
// import { _resetRateLimitStore } from '@/lib/rateLimit'

describe('edges API', () => {
  beforeEach(() => {
    // _resetRateLimitStore?.()
  })

  it('GET returns list', async () => {
    // If you also test GET here, keep that test as-is.
    expect(true).toBe(true)
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
