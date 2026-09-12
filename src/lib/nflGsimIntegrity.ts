import { createHash, timingSafeEqual } from 'node:crypto'
import type { NflGsimResults } from '@/schemas/nflGsimResults'

const FLOAT_FIELDS = new Set([
  'away_win_probability',
  'home_win_probability',
  'tie_probability',
  'projected_away_score',
  'projected_home_score',
  'projected_margin_home',
  'projected_total_raw',
  'projected_total_calibrated',
  'total_p10',
  'total_p50',
  'total_p90',
  'threshold',
  'over_probability',
  'under_probability',
  'push_probability',
  'home_handicap',
  'home_cover_probability',
  'away_cover_probability',
  'passing_yards',
  'rushing_yards',
  'receiving_yards',
  'receptions',
  'total_touchdowns',
])

// Mirrors nfl-gsim's json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=True).
function pythonCanonicalJson(value: unknown, key?: string): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') {
    return JSON.stringify(value).replace(/[\u007f-\uffff]/g, (char) => {
      const code = char.charCodeAt(0)
      return `\\u${code.toString(16).padStart(4, '0')}`
    })
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite JSON number')
    if (FLOAT_FIELDS.has(key ?? '') && Number.isInteger(value)) return `${value}.0`
    const rendered = String(value)
    return rendered.replace(/e([+-])(\d)$/, 'e$10$2')
  }
  if (Array.isArray(value)) return `[${value.map((item) => pythonCanonicalJson(item)).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )
    return `{${entries
      .map(([entryKey, entryValue]) =>
        `${pythonCanonicalJson(entryKey)}:${pythonCanonicalJson(entryValue, entryKey)}`,
      )
      .join(',')}}`
  }
  throw new TypeError('Unsupported JSON value')
}

export function calculateNflGsimPayloadHash(payload: NflGsimResults): string {
  const { payload_hash: _claimedHash, ...unsignedPayload } = payload
  return createHash('sha256').update(pythonCanonicalJson(unsignedPayload)).digest('hex')
}

export function hasValidNflGsimPayloadHash(payload: NflGsimResults): boolean {
  const expected = Buffer.from(calculateNflGsimPayloadHash(payload), 'hex')
  const claimed = Buffer.from(payload.payload_hash, 'hex')
  return expected.length === claimed.length && timingSafeEqual(expected, claimed)
}
