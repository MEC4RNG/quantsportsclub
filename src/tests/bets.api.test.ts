import { beforeEach, describe, expect, it, vi } from 'vitest'

// Minimal types for the mock
type Bet = {
  id: string
  userId: string
  pick: string
  stakeUnits: number
  status: 'pending' | 'win' | 'loss' | 'void'
  createdAt?: Date
  oddsAmerican?: number
  oddsDecimal?: number
}
type PrismaMock = {
  bet: {
    findMany: () => Promise<Bet[]>
    create: (args: { data: Partial<Bet> & { userId: string; pick: string; stakeUnits: number; status?: Bet['status'] } }) => Promise<Bet>
    findUnique: (args: { where: { id: string } }) => Promise<Bet | null>
    update: (args: { where: { id: string }; data: Partial<Bet> }) => Promise<Bet>
  }
  bankrollEntry: {
    create: (args: { data: { userId: string; kind: 'bet' | 'win' | 'loss' | 'adjustment' | 'deposit' | 'withdrawal'; units: number; notes?: string } }) => Promise<unknown>
  }
  $transaction: <T>(fn: (tx: PrismaMock) => Promise<T> | T) => Promise<T>
}

vi.mock('@/lib/db', () => {
  const mock: PrismaMock = {
    bet: {
      findMany: async () => [{ id: 'bet1', userId: 'u1', pick: 'PHI -3.5', stakeUnits: 1, status: 'pending', createdAt: new Date(), oddsAmerican: -110 }],
      create: async (args) => ({ id: 'bet2', status: 'pending', createdAt: new Date(), ...args.data } as Bet),
      findUnique: async ({ where: { id } }) =>
        id === 'bet2' ? ({ id: 'bet2', userId: 'u1', pick: 'PHI -3.5', stakeUnits: 1, status: 'pending', oddsAmerican: -110 } as Bet) : null,
      update: async ({ where: { id }, data }) => ({ id, userId: 'u1', pick: 'PHI -3.5', stakeUnits: 1, status: (data.status as Bet['status']) ?? 'pending', ...data } as Bet),
    },
    bankrollEntry: {
      create: async () => ({}),
    },
    $transaction: async (fn) => fn((mock as unknown) as PrismaMock),
  }
  return { prisma: mock }
})

import { GET as GET_BETS, POST as POST_BETS } from '@/app/api/bets/route'
import { POST as POST_SETTLE } from '@/app/api/bets/[id]/settle/route'
import { _resetRateLimitStore } from '@/lib/rateLimit'

function req(url: string, body?: Record<string, unknown>, ip = '9.9.9.9') {
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
    for (let i = 0; i < 10; i++) {
      const r = await POST_BETS(req('http://test/api/bets', { userId: 'u1', sport: 'NFL', pick: 'PHI -3.5', stakeUnits: 1 }))
      expect(r.status).toBe(201)
    }
    const blocked = await POST_BETS(req('http://test/api/bets', { userId: 'u1', sport: 'NFL', pick: 'PHI -3.5', stakeUnits: 1 }))
    expect(blocked.status).toBe(429)
  })

  it('settles a bet to win', async () => {
    const ctx: { params: Promise<{ id: string }> } = { params: Promise.resolve({ id: 'bet2' }) }
    const res = await POST_SETTLE(req('http://test/api/bets/bet2/settle', { result: 'win' }), ctx)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('win')
  })
})
