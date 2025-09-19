'use client'

import { useMemo, useState } from 'react'
import { americanToDecimal, impliedFromAmerican, kellyFraction } from '@/lib/odds'

function label(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : '—'
}

export default function Betslip({ initialBankroll }: { initialBankroll: number }) {
  const [sport, setSport] = useState('NBA')
  const [market, setMarket] = useState('Spread')
  const [pick, setPick] = useState('')
  const [bookOdds, setBookOdds] = useState<number | ''>('')
  const [fairOdds, setFairOdds] = useState<number | ''>('')
  const [bankroll, setBankroll] = useState<number>(initialBankroll)
  const [kellyMult, setKellyMult] = useState<number>(0.5)

  const p = useMemo(() => {
    const fair = typeof fairOdds === 'number' ? fairOdds : NaN
    return Number.isFinite(fair) ? impliedFromAmerican(fair) : NaN
  }, [fairOdds])

  const d = useMemo(() => {
    const book = typeof bookOdds === 'number' ? bookOdds : NaN
    return Number.isFinite(book) ? americanToDecimal(book) : NaN
  }, [bookOdds])

  const fKelly = useMemo(() => {
    if (!Number.isFinite(p) || !Number.isFinite(d)) return 0
    return kellyFraction(p, d)
  }, [p, d])

  const recUnits = useMemo(() => bankroll * fKelly * kellyMult, [bankroll, fKelly, kellyMult])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (process.env.NODE_ENV === 'production') {
      alert('Create is disabled in production. Use the API from a trusted client/server.')
      return
    }
    const payload = {
      sport, market, pick,
      stakeUnits: Math.max(0, Number(recUnits.toFixed(2))),
      bookOdds: typeof bookOdds === 'number' ? bookOdds : null,
      fairOdds: typeof fairOdds === 'number' ? fairOdds : null,
    }
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' }, // dev only (no API key exposed)
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      alert('Bet created (dev only).')
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      alert('Failed to create: ' + error)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
      <label>
        <div>Sport</div>
        <input value={sport} onChange={e => setSport(e.target.value)} />
      </label>
      <label>
        <div>Market</div>
        <input value={market} onChange={e => setMarket(e.target.value)} />
      </label>
      <label style={{ gridColumn: '1 / -1' }}>
        <div>Pick</div>
        <input value={pick} onChange={e => setPick(e.target.value)} placeholder="e.g., BOS -3.5" />
      </label>

      <label>
        <div>Book odds (American)</div>
        <input
          type="number"
          value={bookOdds}
          onChange={e => setBookOdds(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="-110"
        />
      </label>
      <label>
        <div>Fair odds (American)</div>
        <input
          type="number"
          value={fairOdds}
          onChange={e => setFairOdds(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="-102"
        />
      </label>

      <label>
        <div>Bankroll (units)</div>
        <input
          type="number"
          step="0.01"
          value={bankroll}
          onChange={e => setBankroll(Number(e.target.value))}
        />
      </label>

      <label>
        <div>Kelly Multiplier</div>
        <select value={kellyMult} onChange={e => setKellyMult(Number(e.target.value))}>
          <option value={0.25}>25%</option>
          <option value={0.5}>50% (default)</option>
          <option value={1}>100%</option>
        </select>
      </label>

      <div style={{ gridColumn: '1 / -1', padding: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}>
        <div>Implied win (from fair): <strong>{Number.isFinite(p) ? (p * 100).toFixed(1) + '%' : '—'}</strong></div>
        <div>Kelly fraction: <strong>{fKelly > 0 ? (fKelly * 100).toFixed(1) + '%' : '—'}</strong></div>
        <div>Recommended stake: <strong>{Number.isFinite(recUnits) && recUnits > 0 ? recUnits.toFixed(2) + 'u' : '—'}</strong></div>
      </div>

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
        <button type="submit" disabled={process.env.NODE_ENV === 'production'}>
          Create Bet (dev only)
        </button>
      </div>
    </form>
  )
}
