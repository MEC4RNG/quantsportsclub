import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    bet: {
      findMany: async () => [{ id: 'bet1', pick: 'PHI -3.5', userId: 'u1', createdAt: new Date(), status: 'pending', stakeUnits: 1 }],
      create: async (args: { data: Record<string, unknown> }) => ({ id: 'bet2', status: 'pending', ...args.data }),
      findUnique: async ({ where: { id } }: any) => (id === 'bet2' ? { id: 'bet2', userId: 'u1', status: 'pending', stakeUnits: 1, oddsAmerican: -110 } : null),
      update: async ({ where: { id }, data }: any) => ({ id, ...data }),
    },
    bankrollEntry: {
      create: async (_: any) => ({}),
    },
    $transaction: async (fn: any) => fn((await import('@/lib/db')).prisma),
  },
}))

import { GET as GET_BETS, POST as POST_BETS } from '@/app/api/bets/route'
import { POST as POST_SETTLE } from '@/app/api/bets/[id]/settle/route'
import { _resetRateLimitStore } from '@/lib/rateLimit'

function req(url: string, body?: Record<string, unknown>, ip='9.9.9.9') {
  return new Request(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  })
}

describe('bets API', () => {
  beforeEach(() => _resetRateLimitStore())

  it('GET returns list', async () => {
    const res = await GET_BETS()
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST respects rate limit', async () => {
    for (let i=0;i<10;i++) {
      const r = await POST_BETS(req('http://test/api/bets', { userId: 'u1', sport: 'NFL', pick: 'PHI -3.5', stakeUnits: 1 }))
      expect(r.status).toBe(201)
    }
    const blocked = await POST_BETS(req('http://test/api/bets', { userId: 'u1', sport: 'NFL', pick: 'PHI -3.5', stakeUnits: 1 }))
    expect(blocked.status).toBe(429)
  })

  it('settles a bet to win', async () => {
    const res = await POST_SETTLE(req('http://test/api/bets/bet2/settle', { result: 'win' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('win')
  })
})
