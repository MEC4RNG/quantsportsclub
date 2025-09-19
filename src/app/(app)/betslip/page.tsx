// src/app/(app)/betslip/page.tsx
'use client'

import { useState } from 'react'
import styled from 'styled-components'

const Wrap = styled.main`
  max-width: 760px; margin: 32px auto; padding: 20px;
  display: grid; gap: 14px;
`
const Row = styled.div`
  display: grid; gap: 6px;
  label { font-weight: 600; }
  input { padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); }
`
const Actions = styled.div` display: flex; gap: 10px; `
const Btn = styled.button`
  padding: 10px 14px; border-radius: 10px; font-weight: 700;
  border: 1px solid rgba(255,255,255,0.15);
  background: ${({ theme }) => theme.colors.primary}; color: #0b1220;
`

export default function BetslipPage() {
  const [sport, setSport] = useState('NBA')
  const [pick, setPick] = useState('')
  const [stake, setStake] = useState(1)
  const [bookOdds, setBookOdds] = useState<number | ''>('')
  const [fairOdds, setFairOdds] = useState<number | ''>('')

  const [resp, setResp] = useState<string>('')

  const submit = async () => {
    setResp('Submitting…')
    const r = await fetch('/api/bets', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // helps rate limiter treat this as a unique client in dev
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify({
        sport,
        pick,
        stakeUnits: Number(stake),
        bookOdds: bookOdds === '' ? null : Number(bookOdds),
        fairOdds: fairOdds === '' ? null : Number(fairOdds),
      }),
    })
    const j = await r.json().catch(() => ({}))
    setResp(`${r.status} ${r.ok ? 'OK' : 'ERR'} — ${JSON.stringify(j)}`)
  }

  return (
    <Wrap>
      <h2>Quick Betslip</h2>
      <Row>
        <label>Sport</label>
        <input value={sport} onChange={e => setSport(e.target.value)} placeholder="NBA" />
      </Row>
      <Row>
        <label>Pick (required)</label>
        <input value={pick} onChange={e => setPick(e.target.value)} placeholder="BOS -3.5" required />
      </Row>
      <Row>
        <label>Stake (units)</label>
        <input type="number" min={0.01} step={0.01} value={stake} onChange={e => setStake(Number(e.target.value))} />
      </Row>
      <Row>
        <label>Book Odds (American, optional)</label>
        <input value={bookOdds} onChange={e => setBookOdds(e.target.value === '' ? '' : Number(e.target.value))} placeholder="-110" />
      </Row>
      <Row>
        <label>Fair Odds (American, optional)</label>
        <input value={fairOdds} onChange={e => setFairOdds(e.target.value === '' ? '' : Number(e.target.value))} placeholder="-105" />
      </Row>
      <Actions>
        <Btn onClick={submit} disabled={!pick.trim()}>Submit Bet</Btn>
      </Actions>
      <div style={{opacity:.8, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco'}}>
        {resp}
      </div>
    </Wrap>
  )
}
