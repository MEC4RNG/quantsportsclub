// src/tests/bets.api.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { GET as GET_BETS, POST as POST_BETS } from '@/app/api/bets/route'
import { POST as POST_SETTLE } from '@/app/api/bets/[id]/settle/route'
import { NextRequest } from 'next/server'

// ---- helpers ----

// only the settle route needs a ctx; infer its type from the handler
type SettleCtx = Parameters<typeof POST_SETTLE>[1]

// the exact init type for NextRequest
type NextInit = ConstructorParameters<typeof NextRequest>[1]

// test API key used by the gate
const API_KEY = 'test-key'

function req(
  path: string,
  init?: (NextInit & { ip?: string; apiKey?: string }) | undefined,
) {
  const url = 'http://localhost' + path
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json')
  if (init?.ip) headers.set('x-forwarded-for', init.ip)
  if (init?.apiKey) headers.set('x-api-key', init.apiKey)

  const { ip: _ip, apiKey: _apiKey, ...rest } = init ?? {}
  const nextInit: NextInit = { ...rest, headers }
  return new NextRequest(url, nextInit)
}

const json = (body: unknown) => JSON.stringify(body)

// ---- env / rate-limit setup ----

beforeAll(() => {
  process.env.API_KEY = API_KEY
})

beforeEach(() => {
  // If you expose a test-only reset for your limiter, call it here:
  // _resetRateLimitStore?.()
})

// ---- tests ----

describe('bets API', () => {
  it('GET returns list', async () => {
    const res = await GET_BETS(req('/api/bets'))
    expect(res.status).toBe(200)
  })

  it('POST respects rate limit', async () => {
    let lastStatus = 0
    for (let i = 0; i < 11; i++) {
      const res = await POST_BETS(
        req('/api/bets', {
          method: 'POST',
          body: json({
            sport: 'NBA',
            pick: 'LAL -3.5',
            stakeUnits: 1,
            bookOdds: -110,
          }),
          ip: '9.9.9.9',
          apiKey: API_KEY,
        })
      )
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  })

  it('settles a bet to win', async () => {
    // create a bet
    const createRes = await POST_BETS(
      req('/api/bets', {
        method: 'POST',
        body: json({
          sport: 'NBA',
          pick: 'BOS ML',
          stakeUnits: 1,
          bookOdds: -120,
        }),
        ip: '5.5.5.5',
        apiKey: API_KEY,
      })
    )
    expect(createRes.status).toBe(201)
    const created = (await createRes.json()) as { id: string }

    // settle it
    const settleCtx: SettleCtx = {
      // Next 15 route types often use Promise for params
      params: Promise.resolve({ id: created.id }),
    } as SettleCtx

    const settleRes = await POST_SETTLE(
      req(`/api/bets/${created.id}/settle`, {
        method: 'POST',
        body: json({ outcome: 'win' }),
        ip: '5.5.5.5',
        apiKey: API_KEY,
      }),
      settleCtx
    )
    expect(settleRes.status).toBe(200)
    const settled = await settleRes.json()
    expect(settled.status).toBe('win')
  })
})
