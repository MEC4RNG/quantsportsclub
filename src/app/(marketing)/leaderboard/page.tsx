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
        Public teaser for leader rankings. Sign in to view the full interactive board.
      </p>
      <p>
        Go to <Link href="/dashboard/leaderboard">/dashboard/leaderboard</Link> for the
        authenticated version.
      </p>
    </Wrap>
  )
}
