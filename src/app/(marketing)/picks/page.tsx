// src/app/(marketing)/picks/page.tsx
'use client'

import styled from 'styled-components'
import Link from 'next/link'

const Wrap = styled.main`
  max-width: 1100px;
  margin: 40px auto;
  padding: 24px;
`

export default function PicksMarketingPage() {
  return (
    <Wrap>
      <h2>Model outputs</h2>
      <p>
        QSC does not currently publish a public picks feed. Signed-in members can review the
        latest MLB and NFL model snapshots with their readiness labels intact.
      </p>
      <p>
        <Link href="/dashboard">Open the QSC workspace</Link>.
      </p>
    </Wrap>
  )
}
