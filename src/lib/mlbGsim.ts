import { createHash, timingSafeEqual } from 'node:crypto'
import type { MlbGame } from '@/schemas/mlbGsimResults'

export function mlbPayloadHash(body: string) {
  return createHash('sha256').update(body, 'utf8').digest('hex')
}

export function authenticateMlbService(authorization: string | null) {
  const secret = process.env.MLB_GSIM_INGESTION_SECRET
  if (!secret) return 503
  const token = /^Bearer ([^\s]+)$/.exec(authorization ?? '')?.[1]
  if (!token || !timingSafeEqual(Buffer.from(mlbPayloadHash(token), 'hex'),
    Buffer.from(mlbPayloadHash(secret), 'hex'))) return 401
  return 200
}

export function mlbDisplayContext(game: MlbGame, generatedAt: string, now = Date.now()) {
  if (game.context === 'UNAVAILABLE') return 'Unavailable'
  if (game.context === 'PREGAME_REFERENCE' || Date.parse(game.scheduled_start_utc) <= now) {
    return 'Pregame reference'
  }
  if (now - Date.parse(generatedAt) > 90 * 60 * 1000) return 'Stale snapshot'
  return 'Pregame model'
}
