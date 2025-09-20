import { describe, it, expect } from 'vitest'
import { GET as GET_PICKS } from '@/app/api/picks/route'
import { NextRequest } from 'next/server'

const req = (url: string) => new NextRequest('http://localhost' + url)

describe('picks API', () => {
  it('returns paged list', async () => {
    const res = await GET_PICKS(req('/api/picks?page=1&pageSize=5'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.rows)).toBe(true)
  })
})
