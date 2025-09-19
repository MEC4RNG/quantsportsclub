// src/lib/odds.ts

/**
 * Convert American odds to decimal odds.
 * +110 -> 2.10 ; -120 -> 1.8333...
 */
export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) throw new Error('Invalid american odds')
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american)
}

/** Convert decimal odds to American odds (rounded). */
export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) throw new Error('Invalid decimal odds')
  return decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1))
}

/** Implied probability (0..1) from American odds. */
export function impliedFromAmerican(american: number): number {
  if (american > 0) return 100 / (american + 100)
  return Math.abs(american) / (Math.abs(american) + 100)
}

/**
 * Kelly fraction for decimal odds.
 * p = win probability (0..1), d = decimal odds.
 * Returns fraction of bankroll to stake (0..1). Floors at 0 when edge <= 0.
 */
export function kellyFraction(p: number, d: number): number {
  if (!Number.isFinite(p) || !Number.isFinite(d)) throw new Error('Invalid inputs')
  if (p <= 0 || p >= 1 || d <= 1) return 0
  const b = d - 1
  const f = (b * p - (1 - p)) / b
  return Math.max(0, f)
}
