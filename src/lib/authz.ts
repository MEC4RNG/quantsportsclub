// src/lib/authz.ts
import { NextResponse } from 'next/server'

/**
 * If API_KEY is set in env, enforce it via `x-api-key` header.
 * Usage in a route:
 *   const guard = requireApiKey(req)
 *   if (guard) return guard // 401
 */
export function requireApiKey(req: Request) {
  const required = process.env.API_KEY
  if (!required) return null
  const provided = req.headers.get('x-api-key') ?? ''
  if (provided !== required) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
