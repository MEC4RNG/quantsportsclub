// src/tests/stats.api.test.ts
import { describe, it, expect } from 'vitest'
import { GET as GET_SUMMARY } from '@/app/api/stats/summary/route'
import { NextRequest } from 'next/server'

const req = (path: string) => new NextRequest('http://localhost' + path)

describe('stats summary API', () => {
  it('returns summary', async () => {
    const res = await GET_SUMMARY(req('/api/stats/summary?days=7'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.days).toBe(7)
  })
})
