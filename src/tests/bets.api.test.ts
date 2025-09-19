// src/tests/bets.api.test.ts
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { RequestInit as NextRequestInit } from 'next/dist/server/web/spec-extension/request'

vi.mock('@/lib/db', () => import('./__mocks__/dbMock'))

import { GET as GET_BETS, POST as POST_BETS } from '@/app/api/bets/route'
import { POST as POST_SETTLE } from '@/app/api/bets/[id]/settle/route'

// Build a NextRequest (use Next's RequestInit type to avoid TS mismatch)
const nreq = (path = '/api/bets', init?: NextRequestInit) =>
  new NextRequest('http://localhost' + path, init)

// JSON POST init with fixed IP header (keeps rate-limiter deterministic)
const json = (body: unknown, ip = '9.9.9.9'): NextRequestInit => ({
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-forwarded-for': ip,
  },
  body: JSON.stringify(body),
})

describe('bets API', () => {
  it('GET returns list', async () => {
    const res = await GET_BETS(nreq('/api/bets'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST respects rate limit', async () => {
    let last = 0
    for (let i = 0; i < 11; i++) {
      const res = await POST_BETS(
        nreq(
          '/api/bets',
          json(
            {
              sport: 'NBA',
              pick: `TEST-${i}`,
              stakeUnits: 1,
              bookOdds: -110,
              fairOdds: -105,
            },
            '9.9.9.9',
          ),
        ),
      )
      last = res.status
    }
    expect(last).toBe(429)
  })

  it('settles a bet to win', async () => {
    // use a different IP so we aren't rate-limited by the previous test
    const createRes = await POST_BETS(
      nreq(
        '/api/bets',
        json(
          {
            sport: 'NBA',
            pick: 'BOS -3.5',
            stakeUnits: 1,
            bookOdds: -110,
            fairOdds: -105,
          },
          '5.5.5.5',
        ),
      ),
    )
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as { id: string }

    const settleRes = await POST_SETTLE(
      nreq(
        `/api/bets/${created.id}/settle`,
        json({ outcome: 'win' }, '5.5.5.5'),
      ),
      { params: Promise.resolve({ id: created.id }) } as any,
    )
    expect(settleRes.status).toBe(200)
    const settled = await settleRes.json()
    expect(settled.status).toBe('win')
  })
})
