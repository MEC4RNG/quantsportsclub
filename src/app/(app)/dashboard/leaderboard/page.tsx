// src/app/(app)/dashboard/leaderboard/page.tsx
'use client'

import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import styled from 'styled-components'

const Wrap = styled.main`
  max-width: 1100px;
  margin: 40px auto;
  padding: 24px;
`

const H2 = styled.h2`
  margin: 0 0 8px;
`

const P = styled.p`
  opacity: 0.9;
  margin: 0 0 16px;
`

const Card = styled.section`
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th, td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  th { opacity: 0.8; font-weight: 600; }
  tbody tr:hover { background: rgba(255,255,255,0.04); }
`

type LeaderRow = {
  rank: number
  name: string
  model: string
  sport: string
  roiPct: number
  units: number
  sample: number
}

const demoRows: LeaderRow[] = [
  { rank: 1, name: 'AlphaEdge', model: 'XGBoost V3', sport: 'NBA', roiPct: 7.8, units: 32.4, sample: 412 },
  { rank: 2, name: 'SharpBot', model: 'NN 2-layer', sport: 'NFL', roiPct: 6.2, units: 21.1, sample: 288 },
  { rank: 3, name: 'ValueSeeker', model: 'Elo+Market', sport: 'NHL', roiPct: 4.9, units: 15.7, sample: 350 },
]

export default function LeaderboardAppPage() {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <Wrap>
        <H2>Leaderboard</H2>
        <P>Loading your session…</P>
      </Wrap>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Wrap>
        <H2>Leaderboard</H2>
        <P>You need to sign in to view the full leaderboard.</P>
        <button
          onClick={() => signIn('github')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Sign in with GitHub
        </button>
        <P style={{ marginTop: 16 }}>
          Or see the public preview at{' '}
          <Link href="/leaderboard">/leaderboard</Link>.
        </P>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <H2>Leaderboard (App)</H2>
      <P>
        Compare models and handicappers by ROI, units won, and sample size. (Demo data below — wire
        to real rankings in a later sprint.)
      </P>

      <Card>
        <Table aria-label="Leaderboard rankings">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Model</th>
              <th>Sport</th>
              <th>ROI</th>
              <th>Units</th>
              <th>Sample</th>
            </tr>
          </thead>
          <tbody>
            {demoRows.map((r: LeaderRow) => (
              <tr key={r.rank}>
                <td>{r.rank}</td>
                <td>{r.name}</td>
                <td>{r.model}</td>
                <td>{r.sport}</td>
                <td>{r.roiPct.toFixed(1)}%</td>
                <td>{r.units.toFixed(1)}</td>
                <td>{r.sample}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <P style={{ marginTop: 16 }}>
        Looking for picks? Head to <Link href="/dashboard/picks">/dashboard/picks</Link>.
      </P>
    </Wrap>
  )
}
