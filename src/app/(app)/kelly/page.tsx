'use client'

import React, { useMemo, useState } from 'react'

type OddsType = 'american' | 'decimal'

function americanToDecimal(american: number): number {
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american)
}

export default function KellyPage() {
  const [bankroll, setBankroll] = useState<number>(1000)
  const [prob, setProb] = useState<number>(0.55)                // true win probability (0–1)
  const [oddsType, setOddsType] = useState<OddsType>('american')
  const [american, setAmerican] = useState<number>(-110)        // book line (American)
  const [decimal, setDecimal] = useState<number>(1.91)          // book line (Decimal)
  const [fraction, setFraction] = useState<number>(1)           // 1.0 = full Kelly, 0.5 = half Kelly

  const b = useMemo<number>(() => {
    const dec = oddsType === 'american' ? americanToDecimal(american) : decimal
    return Math.max(0, dec - 1) // b = net decimal odds
  }, [oddsType, american, decimal])

  const q = 1 - prob
  const kelly = useMemo<number>(() => {
    // Kelly fraction (of bankroll): f* = (b*p - q) / b
    if (b <= 0) return 0
    const raw = (b * prob - q) / b
    return Math.max(0, raw) // clamp negative to 0 (no bet)
  }, [b, prob, q])

  const stake = useMemo<number>(() => bankroll * kelly * fraction, [bankroll, kelly, fraction])

  const onOddsTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOddsType(e.currentTarget.value as OddsType)
  }

  const onNumber = (fn: (n: number) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => fn(Number(e.currentTarget.value))

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
      <h1>Kelly Calculator</h1>
      <p style={{ opacity: 0.8 }}>
        Enter your true win probability and the bookmaker’s odds. Choose a fraction (e.g., 0.5 for
        half-Kelly) to reduce variance.
      </p>

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <label>
          Bankroll (units):{' '}
          <input type="number" value={bankroll} onChange={onNumber(setBankroll)} />
        </label>

        <label>
          True win probability (0–1):{' '}
          <input type="number" step="0.01" min="0" max="1" value={prob} onChange={onNumber(setProb)} />
        </label>

        <label>
          Odds format:{' '}
          <select value={oddsType} onChange={onOddsTypeChange}>
            <option value="american">American</option>
            <option value="decimal">Decimal</option>
          </select>
        </label>

        {oddsType === 'american' ? (
          <label>
            American odds:{' '}
            <input type="number" value={american} onChange={onNumber(setAmerican)} />
          </label>
        ) : (
          <label>
            Decimal odds:{' '}
            <input type="number" step="0.01" value={decimal} onChange={onNumber(setDecimal)} />
          </label>
        )}

        <label>
          Kelly fraction (0–1):{' '}
          <input type="number" step="0.05" min="0" max="1" value={fraction} onChange={onNumber(setFraction)} />
        </label>
      </div>

      <hr style={{ margin: '16px 0' }} />

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6 }}>
        <dt>Net odds (b = decimal − 1)</dt>
        <dd style={{ textAlign: 'right' }}>{b.toFixed(3)}</dd>

        <dt>Full Kelly fraction</dt>
        <dd style={{ textAlign: 'right' }}>{(kelly * 100).toFixed(2)}%</dd>

        <dt>Recommended stake</dt>
        <dd style={{ textAlign: 'right', fontWeight: 700 }}>{stake.toFixed(2)} units</dd>
      </dl>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Note: If <em>bp − q &lt; 0</em>, Kelly would be negative (no bet). We clamp to 0 here.
      </p>
    </main>
  )
}
