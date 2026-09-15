import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sessionUserId, findFirst, updateMany, findUniqueOrThrow, transaction } = vi.hoisted(
  () => ({
    sessionUserId: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    transaction: vi.fn(),
  }),
)

vi.mock('@/lib/sessionUser', () => ({ getSessionUserId: sessionUserId }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ ok: true, limit: 20, remaining: 19, reset: 0 }),
}))
vi.mock('@/lib/log', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/db', () => ({
  prisma: { $transaction: transaction },
}))

import { POST } from '@/app/api/bets/[id]/settle/route'

const request = (body: unknown) =>
  new Request('http://localhost/api/bets/bet-1/settle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never

const context = { params: Promise.resolve({ id: 'bet-1' }) }

describe('bet settlement ownership', () => {
  beforeEach(() => {
    sessionUserId.mockReset().mockResolvedValue('user-1')
    findFirst.mockReset()
    updateMany.mockReset().mockResolvedValue({ count: 1 })
    findUniqueOrThrow.mockReset()
    transaction.mockReset().mockImplementation((callback) =>
      callback({ bet: { findFirst, updateMany, findUniqueOrThrow } }),
    )
  })

  it('rejects anonymous settlement before reading a bet', async () => {
    sessionUserId.mockResolvedValue(null)
    const response = await POST(request({ outcome: 'win' }), context)

    expect(response.status).toBe(401)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('does not reveal or update a bet owned by another user', async () => {
    findFirst.mockResolvedValue(null)
    const response = await POST(request({ outcome: 'loss' }), context)

    expect(response.status).toBe(404)
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'bet-1', userId: 'user-1' } })
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('computes winnings and atomically settles the signed-in user bet', async () => {
    findFirst.mockResolvedValue({
      id: 'bet-1', userId: 'user-1', status: 'pending', stakeUnits: 1, bookOdds: -120,
    })
    findUniqueOrThrow.mockResolvedValue({ id: 'bet-1', status: 'win', realizedUnits: 0.8333 })
    const response = await POST(request({ outcome: 'win' }), context)

    expect(response.status).toBe(200)
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'bet-1', userId: 'user-1', status: 'pending' },
      data: { status: 'win', realizedUnits: 0.8333 },
    })
  })

  it('rejects client-supplied realized units', async () => {
    const response = await POST(request({ outcome: 'win', realizedUnits: 999 }), context)

    expect(response.status).toBe(400)
    expect(transaction).not.toHaveBeenCalled()
  })
})
