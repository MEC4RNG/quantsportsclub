'use client'

import { useMemo, useState } from 'react'
import styled from 'styled-components'

/* ---------------- UI ---------------- */

const Wrap = styled.main`
  max-width: 960px; margin: 32px auto; padding: 24px;
  display: grid; gap: 20px;
`
const Row = styled.div`
  display: grid; gap: 12px;
  grid-template-columns: 160px 1fr;
  align-items: center;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`
const Label = styled.label`
  font-weight: 600; opacity: .9;
`
const Input = styled.input`
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.03);
  color: inherit; font-size: 16px;
`
const Select = styled.select`
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.03);
  color: inherit; font-size: 16px;
`
const Grid2 = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`
const ButtonRow = styled.div`
  display: flex; gap: 12px; justify-content: flex-end; margin-top: 4px;
`
const Button = styled.button<{variant?: 'primary'|'ghost'}>`
  padding: 10px 14px; border-radius: 10px; font-weight: 700;
  border: 1px solid ${({ variant }) => variant === 'ghost' ? 'rgba(255,255,255,.15)' : 'transparent'};
  background: ${({ theme, variant }) => variant === 'ghost' ? 'transparent' : theme.colors.primary};
  color: ${({ variant }) => variant === 'ghost' ? 'inherit' : '#0b1220'};
  opacity: ${({ disabled }) => disabled ? .6 : 1};
  pointer-events: ${({ disabled }) => disabled ? 'none' : 'auto'};
`
const Small = styled.p`
  margin: 4px 0 0; font-size: 13px; opacity: .75;
`
const KPIs = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
  @media (max-width: 800px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`
const Card = styled.div`
  padding: 12px; border-radius: 12px; background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
`
const H = styled.div` font-size: 12px; opacity: .7; `
const V = styled.div` font-size: 18px; font-weight: 700; `

/* --------------- math ---------------- */

function americanToProb(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}
function americanToPayoutRatio(odds: number): number {
  // b in Kelly formula: profit per unit staked
  return odds > 0 ? odds / 100 : 100 / Math.abs(odds)
}
function kellyFraction(fairProb: number, payoutRatio: number): number {
  const p = fairProb
  const q = 1 - p
  const b = payoutRatio
  const f = (b * p - q) / b
  // clamp negatives to 0 (no-bet) and absurd positives to 1
  return Math.max(0, Math.min(1, f))
}

/* ----------- page component ---------- */

export default function BetslipPage() {
  // form fields
  const [sport, setSport] = useState('NBA')
  const [market, setMarket] = useState('Spread')
  const [pick, setPick] = useState('LAL -3.5')

  // keep raw inputs as strings so '+' / '-' are allowed while typing
  const [bookOddsInput, setBookOddsInput] = useState<string>('')
  const [fairOddsInput, setFairOddsInput] = useState<string>('')

  // stake (units)
  const [stakeUnitsInput, setStakeUnitsInput] = useState<string>('1')

  // parse helpers
  const parseSignedInt = (s: string) =>
    /^[-+]?\d+$/.test(s) ? parseInt(s, 10) : null
  const parseFloatSafe = (s: string) =>
    /^[-+]?\d*\.?\d+$/.test(s) ? parseFloat(s) : null

  const bookOdds = useMemo(() => parseSignedInt(bookOddsInput), [bookOddsInput])
  const fairOdds = useMemo(() => parseSignedInt(fairOddsInput), [fairOddsInput])
  const stakeUnits = useMemo(
    () => parseFloatSafe(stakeUnitsInput) ?? 0,
    [stakeUnitsInput],
  )

  // derived metrics
  const implied = useMemo(() => (bookOdds !== null ? americanToProb(bookOdds) : null), [bookOdds])
  const fair = useMemo(() => (fairOdds !== null ? americanToProb(fairOdds) : null), [fairOdds])
  const edgePct = useMemo(() => (fair !== null && implied !== null ? (fair - implied) : null), [fair, implied])
  const kelly = useMemo(() => {
    if (fair === null || bookOdds === null) return null
    const b = americanToPayoutRatio(bookOdds)
    return kellyFraction(fair, b)
  }, [fair, bookOdds])

  // simple validity
  const canSubmit = !!pick.trim() && bookOdds !== null && fairOdds !== null && stakeUnits > 0

  // UI feedback
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function onSubmit() {
    setMsg(null)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // include API key header if you’ve enabled it in env
          ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY } : {}),
        },
        body: JSON.stringify({
          sport,
          market,
          pick,
          stakeUnits,
          bookOdds,  // number (server computes implied/edge)
          fairOdds,  // number
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      setMsg({ kind: 'ok', text: 'Bet submitted ✅' })
      // light reset except odds (often placing series of bets)
      setPick('')
      setStakeUnitsInput('1')
    } catch (err: any) {
      setMsg({ kind: 'err', text: err?.message ?? 'Submit failed' })
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n: number | null, digits = 2) =>
    n === null || !Number.isFinite(n) ? '—' : n.toFixed(digits)

  return (
    <Wrap>
      <h2>Betslip</h2>

      <Row>
        <Label>Sport</Label>
        <Select value={sport} onChange={(e) => setSport(e.target.value)}>
          {['NBA','NFL','MLB','NHL','NCAAB','NCAAF','Soccer'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </Row>

      <Row>
        <Label>Market</Label>
        <Select value={market} onChange={(e) => setMarket(e.target.value)}>
          {['Spread','Moneyline','Total','Prop'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
      </Row>

      <Row>
        <Label>Pick</Label>
        <Input
          placeholder="LAL -3.5"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        />
      </Row>

      <Row>
        <Label>Odds (Book / Fair)</Label>
        <Grid2>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[-+]?[0-9]*"
            placeholder="-110"
            value={bookOddsInput}
            onChange={(e) => {
              const v = e.target.value
              if (v === '' || v === '-' || v === '+' || /^[-+]?\d{0,5}$/.test(v)) {
                setBookOddsInput(v)
              }
            }}
          />
          <Input
            type="text"
            inputMode="numeric"
            pattern="[-+]?[0-9]*"
            placeholder="-105"
            value={fairOddsInput}
            onChange={(e) => {
              const v = e.target.value
              if (v === '' || v === '-' || v === '+' || /^[-+]?\d{0,5}$/.test(v)) {
                setFairOddsInput(v)
              }
            }}
          />
        </Grid2>
        <Small>Enter American odds. You can type “-” or “+” while editing.</Small>
      </Row>

      <Row>
        <Label>Stake (units)</Label>
        <Input
          type="text"
          inputMode="decimal"
          pattern="[-+]?[0-9]*[.]?[0-9]*"
          placeholder="1"
          value={stakeUnitsInput}
          onChange={(e) => {
            const v = e.target.value
            if (v === '' || /^[-+]?\d*\.?\d{0,3}$/.test(v)) {
              setStakeUnitsInput(v)
            }
          }}
        />
        <Small>We’ll compute edge and Kelly from the odds; you choose stake.</Small>
      </Row>

      <KPIs>
        <Card><H>Implied (book)</H><V>{fmt(implied !== null ? implied*100 : null, 2)}%</V></Card>
        <Card><H>Fair (model)</H><V>{fmt(fair !== null ? fair*100 : null, 2)}%</V></Card>
        <Card><H>Edge</H><V>{fmt(edgePct !== null ? edgePct*100 : null, 2)}%</V></Card>
        <Card><H>Kelly fraction</H><V>{fmt(kelly, 3)}</V></Card>
      </KPIs>

      {msg && (
        <Small style={{ color: msg.kind === 'ok' ? '#7CFC9E' : '#ff8d8d' }}>
          {msg.text}
        </Small>
      )}

      <ButtonRow>
        <Button variant="ghost" onClick={() => {
          setBookOddsInput(''); setFairOddsInput(''); setPick(''); setStakeUnitsInput('1')
          setMsg(null)
        }}>
          Clear
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || submitting}>
          {submitting ? 'Submitting…' : 'Submit Bet'}
        </Button>
      </ButtonRow>
    </Wrap>
  )
}
