import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export type ServiceAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: 'Unauthorized' | 'Service authentication unavailable' }

export function authenticateNflGsimService(req: NextRequest): ServiceAuthResult {
  const expected = process.env.NFL_GSIM_INGESTION_SECRET
  if (!expected) {
    return { ok: false, status: 503, error: 'Service authentication unavailable' }
  }

  const authorization = req.headers.get('authorization') ?? ''
  const match = /^Bearer ([^\s]+)$/.exec(authorization)
  if (!match?.[1] || !timingSafeEqual(digest(match[1]), digest(expected))) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  return { ok: true }
}
