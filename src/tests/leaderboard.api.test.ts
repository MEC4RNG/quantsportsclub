import { describe, it, expect } from 'vitest'
import { GET as GET_BOARD } from '@/app/api/leaderboard/route'
import { NextRequest } from 'next/server'
const req = (url: string) => new NextRequest('http://localhost' + url)

describe('leaderboard API', () => {
  it('returns rows', async () => {
    const res = await GET_BOARD(req('/api/leaderboard?days=90'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.rows)).toBe(true)
  })
})
