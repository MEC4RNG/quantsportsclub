import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sessionUserId, bankrollFindMany, betFindMany, betCount, betAggregate } = vi.hoisted(
  () => ({
    sessionUserId: vi.fn(),
    bankrollFindMany: vi.fn(),
    betFindMany: vi.fn(),
    betCount: vi.fn(),
    betAggregate: vi.fn(),
  }),
)
vi.mock('@/lib/sessionUser', () => ({ getSessionUserId: sessionUserId }))
vi.mock('@/lib/db', () => ({
  prisma: {
    bankrollEntry: { findMany: bankrollFindMany },
    bet: { findMany: betFindMany, count: betCount, aggregate: betAggregate },
  },
}))

import { GET as getBankroll } from '@/app/api/bankroll/route'
import { POST as importBankroll } from '@/app/api/bankroll/import/route'
import { GET as getBets } from '@/app/api/bets/route'
import { GET as getStats } from '@/app/api/stats/summary/route'

describe('personal data routes', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    sessionUserId.mockReset()
    bankrollFindMany.mockReset().mockResolvedValue([])
    betFindMany.mockReset().mockResolvedValue([])
    betCount.mockReset().mockResolvedValue(0)
    betAggregate.mockReset().mockResolvedValue({ _sum: {} })
  })

  it('rejects anonymous reads before querying private records', async () => {
    sessionUserId.mockResolvedValue(null)
    const responses = await Promise.all([
      getBankroll(),
      getBets(new Request('http://localhost/api/bets') as never),
      getStats(new Request('http://localhost/api/stats/summary?days=7') as never),
    ])
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401])
    expect(bankrollFindMany).not.toHaveBeenCalled()
    expect(betFindMany).not.toHaveBeenCalled()
    expect(betCount).not.toHaveBeenCalled()
  })

  it('scopes bankroll, bet and aggregate reads to the session user', async () => {
    sessionUserId.mockResolvedValue('user-1')
    await getBankroll()
    await getBets(new Request('http://localhost/api/bets') as never)
    await getStats(new Request('http://localhost/api/stats/summary?days=7') as never)
    expect(bankrollFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    })
    expect(betFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    )
    for (const call of betCount.mock.calls) expect(call[0].where.userId).toBe('user-1')
    for (const call of betAggregate.mock.calls) expect(call[0].where.userId).toBe('user-1')
  })

  it('requires the server API key for bankroll imports', async () => {
    vi.stubEnv('API_KEY', 'server-only-key')
    const response = await importBankroll(
      new Request('http://localhost/api/bankroll/import', {
        method: 'POST',
        body: 'userId,kind,units\nuser-1,deposit,10',
      }) as never,
    )
    expect(response.status).toBe(401)
  })
})
