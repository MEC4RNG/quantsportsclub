import { describe, it, expect } from 'vitest'
import {
  americanToDecimal,
  decimalToAmerican,
  impliedFromAmerican,
  kellyFraction,
} from '@/lib/odds'

describe('odds math', () => {
  it('american<->decimal', () => {
    expect(americanToDecimal(+110)).toBeCloseTo(2.10, 3)
    expect(americanToDecimal(-120)).toBeCloseTo(1.8333, 3)
    expect(decimalToAmerican(2.10)).toBe(110)
    expect(decimalToAmerican(1.8333333333)).toBe(-120)
  })

  it('implied prob', () => {
    expect(impliedFromAmerican(+100)).toBeCloseTo(0.5, 6)
    expect(impliedFromAmerican(-200)).toBeCloseTo(0.666666, 5)
  })

  it('kelly fraction', () => {
    // positive edge at even money: p=0.55, d=2 → f = 10%
    expect(kellyFraction(0.55, 2)).toBeCloseTo(0.10, 6)

    // no edge → 0
    expect(kellyFraction(0.50, 2)).toBe(0)

    // positive edge at d=1.9 (~ -111) with p=0.60 → ~15.556%
    expect(kellyFraction(0.60, 1.9)).toBeCloseTo(0.15556, 4)

    // negative edge clamps to 0
    expect(kellyFraction(0.45, 2)).toBe(0)

    // invalid inputs clamp to 0
    expect(kellyFraction(0.0, 2)).toBe(0)
    expect(kellyFraction(1.0, 2)).toBe(0)
    expect(kellyFraction(0.60, 1.0)).toBe(0) // decimal <= 1 invalid
  })
})
