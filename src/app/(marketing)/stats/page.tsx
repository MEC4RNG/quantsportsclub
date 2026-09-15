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
        Auditable MLB and NFL performance reports are available in the signed-in workspace.
        They show coverage and sample limitations alongside every result.
      </p>
      <p>
        <Link href="/dashboard">Open the QSC workspace</Link>.
      </p>
    </Wrap>
  )
}
