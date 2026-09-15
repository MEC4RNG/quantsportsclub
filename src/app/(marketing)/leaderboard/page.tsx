// src/app/(marketing)/leaderboard/page.tsx
'use client'

import styled from 'styled-components'
import Link from 'next/link'

const Wrap = styled.main`
  max-width: 1100px;
  margin: 40px auto;
  padding: 24px;
`

export default function LeaderboardMarketingPage() {
  return (
    <Wrap>
      <h2>Leaderboard</h2>
      <p>
        QSC does not publish a model or handicapper leaderboard yet. Current model reports use
        prospective results and frozen baselines instead of promotional rankings.
      </p>
      <p>
        <Link href="/dashboard">Open the QSC workspace</Link>.
      </p>
    </Wrap>
  )
}
