'use client'

import { useMemo, useState } from 'react'

function americanToDecimal(american: number) {
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american)
}

export default function KellyPage() {
  const [bankroll, setBankroll] = useState(1000)
  const [prob, setProb] = useState(0.55)          // true win probability (0-1)
  const [oddsType, setOddsType] = useState<'american' | 'decimal'>('american')
  const [american, setAmerican] = useState(-110)  // book line
  const [decimal, setDecimal] = useState(1.91)    // book line
  const [fraction, setFraction] = useState(1)     // 1.0 = full Kelly, 0.5 = half Kelly

  const b = useMemo(() => {
    const dec = oddsType === 'american' ? americanToDecimal(Number(american)) : Number(decimal)
    return Math.max(0, dec - 1) // b = net decimal odds
  }, [oddsType, american, decimal])

  const q = 1 - prob
  const kelly = useMemo(() => {
    // Kelly fraction (of bankroll): f* = (b*p - q) / b
    if (b <= 0) return 0
    const raw = (b * prob - q) / b
    return Math.max(0, raw) // no negative bets
  }, [b, prob, q])

  const stake = useMemo(() => bankroll * kelly * fraction, [bankroll, kelly, fraction])

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
          <input type="number" value={bankroll} onChange={(e) => setBankroll(Number(e.target.value))} />
        </label>

        <label>
          True win probability (0–1):{' '}
          <input type="number" step="0.01" min="0" max="1" value={prob}
                 onChange={(e) => setProb(Number(e.target.value))} />
        </label>

        <label>
          Odds format:{' '}
          <select value={oddsType} onChange={(e) => setOddsType(e.target.value as any)}>
            <option value="american">American</option>
            <option value="decimal">Decimal</option>
          </select>
        </label>

        {oddsType === 'american' ? (
          <label>
            American odds:{' '}
            <input type="number" value={american}
                   onChange={(e) => setAmerican(Number(e.target.value))} />
          </label>
        ) : (
          <label>
            Decimal odds:{' '}
            <input type="number" step="0.01" value={decimal}
                   onChange={(e) => setDecimal(Number(e.target.value))} />
          </label>
        )}

        <label>
          Kelly fraction (0–1):{' '}
          <input type="number" step="0.05" min="0" max="1" value={fraction}
                 onChange={(e) => setFraction(Number(e.target.value))} />
        </label>
      </div>

      <hr style={{ margin: '16px 0' }} />

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6 }}>
        <dt>Net odds (b = decimal - 1)</dt>
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
