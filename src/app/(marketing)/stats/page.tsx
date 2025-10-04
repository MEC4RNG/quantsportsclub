// src/app/(marketing)/stats/page.tsx
'use client'

import styled from 'styled-components'
import Link from 'next/link'

const Wrap = styled.main`
  max-width: 1100px;
  margin: 40px auto;
  padding: 24px;
`

export default function StatsMarketingPage() {
  return (
    <Wrap>
      <h2>Performance Stats</h2>
      <p>
        Public snapshot of performance. Sign in for full drill-downs by sport, market, and time window.
      </p>
      <p>
        Go to <Link href="/dashboard/stats">/dashboard/stats</Link> for the authenticated version.
      </p>
    </Wrap>
  )
}
