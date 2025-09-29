// src/app/(app)/dashboard/stats/page.tsx
'use client'

import styled from 'styled-components'
import Link from 'next/link'

const Wrap = styled.main`
  max-width: 1100px;
  margin: 40px auto;
  padding: 24px;
`

export default function StatsAppPage() {
  return (
    <Wrap>
      <h2>Stats</h2>
      <p>
        Auth-only performance stats (ROI, units by sport/market/time). Public preview is at{' '}
        <Link href="/stats">/stats</Link>.
      </p>
    </Wrap>
  )
}
