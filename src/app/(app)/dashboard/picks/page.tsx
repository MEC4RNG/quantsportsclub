// src/app/(app)/dashboard/picks/page.tsx
'use client'

import styled from 'styled-components'
import Link from 'next/link'

const Wrap = styled.main`
  max-width: 1100px;
  margin: 40px auto;
  padding: 24px;
`

export default function PicksAppPage() {
  return (
    <Wrap>
      <h2>Picks</h2>
      <p>
        Your authenticated picks feed will go here (filters, model tags, etc). For the public teaser,
        see <Link href="/picks">/picks</Link>.
      </p>
    </Wrap>
  )
}
