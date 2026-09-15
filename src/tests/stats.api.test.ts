// src/tests/stats.api.test.ts
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { GET as GET_SUMMARY } from '@/app/api/stats/summary/route'
import { NextRequest } from 'next/server'

const { sessionUserId } = vi.hoisted(() => ({ sessionUserId: vi.fn() }))
vi.mock('@/lib/sessionUser', () => ({ getSessionUserId: sessionUserId }))

const req = (path: string) => new NextRequest('http://localhost' + path)

describe('stats summary API', () => {
  beforeEach(() => sessionUserId.mockResolvedValue('u1'))

  it('returns summary', async () => {
    const res = await GET_SUMMARY(req('/api/stats/summary?days=7'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.days).toBe(7)
  })

  it('rejects anonymous access', async () => {
    sessionUserId.mockResolvedValue(null)
    const res = await GET_SUMMARY(req('/api/stats/summary?days=7'))
    expect(res.status).toBe(401)
  })
})
