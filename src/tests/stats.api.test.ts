import { describe, it, expect } from 'vitest'
import { GET as GET_SUMMARY } from '@/app/api/stats/summary/route'
import { NextRequest } from 'next/server'
const req = (url: string) => new NextRequest('http://localhost' + url)

describe('stats summary API', () => {
  it('returns summary', async () => {
    const res = await GET_SUMMARY(req('/api/stats/summary?days=30'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('winPct')
  })
})
