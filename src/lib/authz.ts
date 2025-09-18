// src/lib/authz.ts
import { NextResponse } from 'next/server'

/**
 * Require x-api-key for mutating routes when API_KEY is set (prod).
 * Skips in development (tests/dev remain unaffected).
 */
export function requireApiKey(req: Request) {
  const key = process.env.API_KEY
  if (!key || process.env.NODE_ENV === 'development') return null

  const provided = req.headers.get('x-api-key')
  if (provided !== key) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
