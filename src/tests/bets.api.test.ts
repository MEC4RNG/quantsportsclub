import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/db', () => import('./__mocks__/dbMock'))

import { GET as GET_BETS, POST as POST_BETS } from '@/app/api/bets/route'
import { POST as POST_SETTLE } from '@/app/api/bets/[id]/settle/route'

const req = (path = '/api/bets', init?: RequestInit) =>
  new Request('http://localhost' + path, init)

const json = (body: unknown, ip = '9.9.9.9'): RequestInit => ({
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-forwarded-for': ip,
  },
  body: JSON.stringify(body),
})

describe('bets API', () => {
  it('GET returns list', async () => {
    const res = await GET_BETS(req('/api/bets'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST respects rate limit', async () => {
    let last = 0
    for (let i = 0; i < 11; i++) {
      const res = await POST_BETS(
        req('/api/bets', json({
          sport: 'NBA',
          pick: `TEST-${i}`,
          stakeUnits: 1,
          bookOdds: -110,
          fairOdds: -105,
        }, '9.9.9.9')),
      )
      last = res.status
    }
    expect(last).toBe(429)
  })

  it('settles a bet to win', async () => {
    const createRes = await POST_BETS(
      req('/api/bets', json({
        sport: 'NBA',
        pick: 'BOS -3.5',
        stakeUnits: 1,
        bookOdds: -110,
        fairOdds: -105,
      }, '5.5.5.5')),
    )
    expect(createRes.status).toBe(201)
    const created = await createRes.json() as { id: string }

    const settleRes = await POST_SETTLE(
      req(`/api/bets/${created.id}/settle`, json({ outcome: 'win' }, '5.5.5.5')),
      { params: { id: created.id } } as any,
    )
    expect(settleRes.status).toBe(200)
    const settled = await settleRes.json()
    expect(settled.status).toBe('win')
  })
})
