// src/tests/bankroll.api.test.ts
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { GET, POST } from '@/app/api/bankroll/route'
import { _resetRateLimitStore } from '@/lib/rateLimit'

const API_KEY = 'test-key'

// Build a POST request with JSON body, IP, and API key
function req(body: unknown, ip = '127.0.0.1') {
  const headers = new Headers({
    'content-type': 'application/json',
    'x-forwarded-for': ip,
    'x-api-key': API_KEY,
  })
  return new NextRequest('http://localhost/api/bankroll', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('bankroll API', () => {
  beforeAll(async () => {
    // Make sure API key gate passes
    process.env.API_KEY = API_KEY

    // Ensure the test user exists to satisfy FK constraint
    await prisma.user.upsert({
      where: { id: 'u1' },
      update: {},
      create: {
        id: 'u1',
        name: 'Test User',
        email: 'u1@example.com', // safe & unique for tests
      },
    })
  })

  beforeEach(() => {
    _resetRateLimitStore()
  })

  it('GET returns list', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('POST respects rate limit', async () => {
    // First 10 create OK
    for (let i = 0; i < 10; i++) {
      const r = await POST(
        req({ userId: 'u1', kind: 'deposit', units: 1, notes: null })
      )
      expect(r.status).toBe(201)
    }
    // 11th is blocked
    const blocked = await POST(
      req({ userId: 'u1', kind: 'deposit', units: 1, notes: null })
    )
    expect(blocked.status).toBe(429)
  })
})
