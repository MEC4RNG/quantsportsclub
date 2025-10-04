// src/lib/authz.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Gate mutating routes by API key.
 * If no API_KEY env is set, allow all (handy in local dev).
 */
export function requireApiKey(
  req: NextRequest
): { ok: true } | { ok: false; res: NextResponse } {
  const expected = process.env.API_KEY
  if (!expected) return { ok: true } // no gate configured

  // Accept either "x-api-key: <key>" or "Authorization: Bearer <key>"
  const headerKey =
    req.headers.get('x-api-key') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    ''

  if (headerKey === expected) return { ok: true }

  return {
    ok: false,
    res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }
}

/**
 * Helper to attach API key to a RequestInit (useful in tests or server-to-server calls).
 */
export function withApiKey(init: RequestInit = {}): RequestInit {
  const expected = process.env.API_KEY
  if (!expected) return init

  const headers = new Headers(init.headers as HeadersInit | undefined)
  // Prefer x-api-key; tests can also set Authorization if desired
  headers.set('x-api-key', expected)
  return { ...init, headers }
}
