// src/tests/leaderboard.api.test.ts
import { describe, it, expect } from 'vitest'
import { GET as GET_BOARD } from '@/app/api/leaderboard/route'

describe('leaderboard API', () => {
  it('returns array', async () => {
    const res = await GET_BOARD()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
