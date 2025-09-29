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
      <h2>Public Picks Preview</h2>
      <p>
        Teaser for recent picks and methodology. Sign in to view the full feed with filters
        and model attributions.
      </p>
      <p>
        Go to <Link href="/dashboard/picks">/dashboard/picks</Link> for the authenticated version.
      </p>
    </Wrap>
  )
}
